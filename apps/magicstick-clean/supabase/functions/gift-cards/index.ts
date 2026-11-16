// Gift cards: balance check, online purchase, owner-issued cards, and
// delivery (activating a paid card and emailing its code).
//
// Actions (POST { action, ... }):
//   check     public — { code } → { valid, balance_cents }        (rate-limited)
//   purchase  public — creates a pending card + Stripe PaymentIntent,
//             returns client_secret
//   confirm   public — after the browser's payment: re-reads the PaymentIntent
//             from Stripe (never trusts the page), and if it succeeded for this
//             card and amount, activates the card and emails it. Idempotent;
//             stripe-webhook ("deliver") is the backup path
//   issue     admin  — creates an active card right away (paid offline)
//   void      admin  — deactivates a card
//   deliver   internal (service-role bearer, called by stripe-webhook) —
//             activates a paid card and emails the code
//
// Deployed with --no-verify-jwt: public actions protect themselves (rate
// limits, validation), admin actions verify the caller is in admin_users.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), STRIPE_SECRET_KEY,
//          RESEND_API_KEY, OWNER_EMAIL, OWNER_NOTIFY_FROM

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { checkLimits, readLimitedBody, withCors, rejectForeignOrigin, logResendError } from "./guard.ts";

const MAX_BODY_BYTES = 20_000;

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE_KEY);

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY.trim(), {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "magicstickclean@gmail.com";
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "onboarding@resend.dev";
const SITE = "https://magicstickclean.ca";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIGNATURE_EN = "— The Magicstick Clean team\n343-843-7761 · magicstickclean@gmail.com\nhttps://magicstickclean.ca";
const SIGNATURE_FR = "— L’équipe Magicstick Clean\n343-843-7761 · magicstickclean@gmail.com\nhttps://magicstickclean.ca";

type GiftCard = {
  id: string; code: string | null; initial_cents: number; balance_cents: number;
  status: string; source: string; lang: string;
  purchaser_name: string | null; purchaser_email: string | null;
  recipient_name: string | null; recipient_email: string | null;
  message: string | null; deliver_to: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function money(cents: number, fr: boolean) {
  const n = (cents / 100).toFixed(2);
  return fr ? `${n.replace(".", ",")} $` : `$${n}`;
}

function normalizeCode(raw: unknown): string | null {
  let s = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("MSC")) s = s.slice(3);
  if (!/^[A-Z0-9]{12}$/.test(s)) return null;
  return `MSC-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set — skipping email send.");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, reply_to: OWNER_EMAIL, subject, text, ...(html ? { html } : {}) }),
  });
  if (!res.ok) await logResendError(res);
}

// Atomic per-visitor + global hourly limit (guard.ts -> rate_limit_hit in
// Postgres). Fails CLOSED: if the counter can't be read, the request is
// refused with a temporary error instead of running unprotected.
// Returns the response to send when the request must stop, else null.
async function limitGuard(req: Request, form: string, perIpPerHour: number, globalPerHour: number): Promise<Response | null> {
  const result = await checkLimits(supabase, req, form, [
    { scope: "ip", windowSeconds: 3600, max: perIpPerHour },
    { scope: "global", windowSeconds: 3600, max: globalPerHour },
  ]);
  if (result === "limited") return json({ ok: false, error: "rate_limited" }, 429);
  if (result === "error") return json({ ok: false, error: "temporarily_unavailable" }, 503);
  return null;
}

// Admin actions need the two-step sign-in (JWT claim aal = "aal2"), the same
// rule the database applies to admin_users (migration 0027). Only read after
// auth.getUser() has verified the token.
function passedTwoStep(token: string): boolean {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part + "=".repeat((4 - (part.length % 4)) % 4))).aal === "aal2";
  } catch {
    return false;
  }
}

async function requireAdmin(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return false;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user || !passedTwoStep(token)) return false;
  const { data: admin } = await supabase.from("admin_users").select("id").eq("id", data.user.id).maybeSingle();
  return Boolean(admin);
}

function howToUse(fr: boolean) {
  return fr
    ? `Comment l’utiliser : demandez votre soumission gratuite sur ${SITE}/quote.html (ou réservez un ménage standard sur ${SITE}/book.html) et indiquez ce code dans votre message — ou appelez/textez le 343-843-7761. Le montant est déduit de votre prix. Le solde restant demeure sur la carte pour votre prochain ménage, et la carte n’expire jamais.\n\nVérifiez votre solde en tout temps : ${SITE}/gift-cards.html#balance`
    : `How to use it: ask for your free quote at ${SITE}/quote.html (or book a standard cleaning at ${SITE}/book.html) and add this code to your message — or call/text 343-843-7761. The amount comes off your price. Any unused balance stays on the card for your next cleaning, and it never expires.\n\nCheck your balance anytime: ${SITE}/gift-cards.html#balance`;
}

function escHtml(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// The gift card email: a real card to look at (amount + code), the giver's
// message, three short steps and one button. Table layout + inline styles so
// it renders the same in Gmail, Outlook and Apple Mail; the plain-text part
// carries the same content for clients that block HTML.
function giftCardHtml(card: GiftCard, opts: { fr: boolean; headline: string; intro: string; showMessage: boolean }) {
  const { fr } = opts;
  const amount = escHtml(money(card.initial_cents, fr));
  const code = escHtml(card.code);
  const from = escHtml(card.purchaser_name || (fr ? "Quelqu’un de spécial" : "Someone special"));
  const to = card.recipient_name ? escHtml(card.recipient_name) : "";
  const steps = fr
    ? ["Demandez votre soumission gratuite (ou réservez un ménage standard en ligne).", "Indiquez votre code dans le message, ou mentionnez-le au téléphone.", "Le montant est déduit de votre prix. Le solde reste sur la carte, qui n’expire jamais."]
    : ["Ask for your free quote (or book a standard cleaning online).", "Add your code to the message, or mention it on the phone.", "The amount comes off your price. Any balance stays on the card, which never expires."];
  const message = opts.showMessage && card.message
    ? `<tr><td style="padding:0 32px 8px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="border-left:3px solid #7c3aed;padding:4px 0 4px 16px;font:italic 17px/1.5 Georgia,'Times New Roman',serif;color:#374151">« ${escHtml(card.message)} »<div style="font:600 13px/1.4 Arial,Helvetica,sans-serif;color:#6b7280;margin-top:6px;font-style:normal">— ${from}</div></td></tr></table></td></tr>`
    : "";
  return `<!doctype html><html lang="${fr ? "fr" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escHtml(opts.headline)}</title></head>
<body style="margin:0;padding:0;background:#f3f1fb;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${amount} — ${fr ? "votre carte-cadeau Magicstick Clean" : "your Magicstick Clean gift card"}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1fb"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(76,29,149,.12)">
  <tr><td style="padding:28px 32px 8px;font:700 18px/1 Georgia,'Times New Roman',serif;color:#111827"><img src="${SITE}/assets/images/logo-email.png" width="28" height="28" alt="" style="vertical-align:middle;border:0;margin-right:8px">Magicstick Clean</td></tr>
  <tr><td style="padding:16px 32px 4px;font:700 28px/1.2 Georgia,'Times New Roman',serif;color:#111827">${escHtml(opts.headline)}</td></tr>
  <tr><td style="padding:4px 32px 24px;font:16px/1.6 Arial,Helvetica,sans-serif;color:#4b5563">${opts.intro}</td></tr>
  <tr><td style="padding:0 32px 24px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:20px;background:#5b21b6;background-image:linear-gradient(135deg,#7c3aed 0%,#4f46e5 55%,#2563eb 100%)">
      <tr><td style="padding:24px 26px 6px;font:600 12px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#e0e7ff">${fr ? "Carte-cadeau" : "Gift card"}${to ? ` · ${fr ? "pour" : "for"} ${to}` : ""}</td></tr>
      <tr><td style="padding:6px 26px 18px;font:700 44px/1.1 Georgia,'Times New Roman',serif;color:#ffffff">${amount}</td></tr>
      <tr><td style="padding:0 26px 24px"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:12px 16px;font:700 20px/1 'Courier New',Courier,monospace;letter-spacing:.12em;color:#ffffff">${code}</td></tr></table>
      <div style="font:13px/1.4 Arial,Helvetica,sans-serif;color:#e0e7ff;margin-top:10px">${fr ? "Votre code — gardez-le précieusement" : "Your code — keep it handy"}</div></td></tr>
    </table>
  </td></tr>
  ${message}
  <tr><td style="padding:16px 32px 4px;font:700 15px/1.4 Arial,Helvetica,sans-serif;color:#111827">${fr ? "Comment l’utiliser" : "How to use it"}</td></tr>
  ${steps.map((st, i) => `<tr><td style="padding:6px 32px"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td valign="top" style="width:28px"><div style="width:22px;height:22px;border-radius:11px;background:#ede9fe;color:#5b21b6;font:700 12px/22px Arial,Helvetica,sans-serif;text-align:center">${i + 1}</div></td><td style="font:15px/1.5 Arial,Helvetica,sans-serif;color:#374151">${escHtml(st)}</td></tr></table></td></tr>`).join("")}
  <tr><td align="center" style="padding:24px 32px 8px"><a href="${SITE}/quote.html?lang=${fr ? "fr" : "en"}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font:700 16px/1 Arial,Helvetica,sans-serif;padding:16px 28px;border-radius:999px">${fr ? "Utiliser ma carte-cadeau" : "Use my gift card"} &rarr;</a></td></tr>
  <tr><td align="center" style="padding:4px 32px 28px;font:13px/1.5 Arial,Helvetica,sans-serif;color:#6b7280"><a href="${SITE}/gift-cards.html#balance" style="color:#5b21b6">${fr ? "Vérifier mon solde" : "Check my balance"}</a></td></tr>
  <tr><td style="padding:20px 32px;background:#faf9fe;border-top:1px solid #ede9fe;font:13px/1.6 Arial,Helvetica,sans-serif;color:#6b7280">${fr ? "Ménage résidentiel et commercial à Clarence-Rockland, Ottawa et Gatineau." : "Home and business cleaning in Clarence-Rockland, Ottawa and Gatineau."}<br><a href="tel:+13438437761" style="color:#374151;text-decoration:none">343-843-7761</a> · <a href="mailto:magicstickclean@gmail.com" style="color:#374151;text-decoration:none">magicstickclean@gmail.com</a> · <a href="${SITE}" style="color:#374151;text-decoration:none">magicstickclean.ca</a></td></tr>
</table></td></tr></table></body></html>`;
}

// Emails the card to whoever should receive it, a copy/receipt to the
// purchaser when it went to someone else, and a heads-up to the owner.
async function deliverEmails(card: GiftCard) {
  const fr = card.lang === "fr";
  const amount = money(card.initial_cents, fr);
  const note = card.message ? (fr ? `\nMessage : « ${card.message} »\n` : `\nMessage: "${card.message}"\n`) : "";
  const from = card.purchaser_name ? card.purchaser_name : (fr ? "Quelqu’un" : "Someone");
  const toRecipient = card.deliver_to === "recipient" && card.recipient_email;
  const hi = (name: string | null) => fr ? `Bonjour ${name || ""}`.trim() : `Hi ${name || "there"}`;

  if (toRecipient) {
    await sendEmail(
      card.recipient_email!,
      fr ? `${from} vous offre une carte-cadeau Magicstick Clean` : `${from} sent you a Magicstick Clean gift card`,
      fr
        ? `${hi(card.recipient_name)},\n\n${from} vous offre une carte-cadeau Magicstick Clean de ${amount} — un ménage professionnel pour votre maison!\n${note}\nCode de la carte-cadeau : ${card.code}\n\n${howToUse(true)}\n\n${SIGNATURE_FR}`
        : `${hi(card.recipient_name)},\n\n${from} sent you a ${amount} Magicstick Clean gift card — a professional clean for your home!\n${note}\nGift card code: ${card.code}\n\n${howToUse(false)}\n\n${SIGNATURE_EN}`,
      giftCardHtml(card, {
        fr, showMessage: true,
        headline: fr ? `${card.recipient_name ? `${card.recipient_name}, v` : "V"}ous avez reçu un cadeau` : `${card.recipient_name ? `${card.recipient_name}, y` : "Y"}ou’ve got a gift`,
        intro: fr
          ? `<strong>${escHtml(from)}</strong> vous offre un ménage professionnel Magicstick Clean. Votre maison n’attend plus que vous.`
          : `<strong>${escHtml(from)}</strong> is treating you to a professional Magicstick Clean cleaning. Your spotless home is waiting.`,
      }),
    );
  }

  if (card.purchaser_email) {
    const forWho = card.recipient_name ? (fr ? ` pour ${card.recipient_name}` : ` for ${card.recipient_name}`) : "";
    await sendEmail(
      card.purchaser_email,
      fr ? `Votre carte-cadeau Magicstick Clean de ${amount}` : `Your ${amount} Magicstick Clean gift card`,
      toRecipient
        ? (fr
          ? `${hi(card.purchaser_name)},\n\nMerci! Votre carte-cadeau de ${amount}${forWho} a été envoyée par courriel à ${card.recipient_email}.\n\nPour vos dossiers, le code est : ${card.code}\n\n${SIGNATURE_FR}`
          : `${hi(card.purchaser_name)},\n\nThank you! Your ${amount} gift card${forWho} was emailed to ${card.recipient_email}.\n\nFor your records, the code is: ${card.code}\n\n${SIGNATURE_EN}`)
        : (fr
          ? `${hi(card.purchaser_name)},\n\nMerci! Voici votre carte-cadeau Magicstick Clean de ${amount}${forWho}, prête à offrir — transférez ce courriel ou partagez simplement le code.\n${note}\nCode de la carte-cadeau : ${card.code}\n\n${howToUse(true)}\n\n${SIGNATURE_FR}`
          : `${hi(card.purchaser_name)},\n\nThank you! Here's your ${amount} Magicstick Clean gift card${forWho}, ready to give — forward this email or just share the code.\n${note}\nGift card code: ${card.code}\n\n${howToUse(false)}\n\n${SIGNATURE_EN}`),
      giftCardHtml(card, toRecipient
        ? {
          fr, showMessage: false,
          headline: fr ? "Merci, votre cadeau est parti" : "Thank you, your gift is on its way",
          intro: fr
            ? `Votre carte-cadeau${escHtml(forWho)} vient d’être envoyée à <strong>${escHtml(card.recipient_email)}</strong>. Voici une copie pour vos dossiers.`
            : `Your gift card${escHtml(forWho)} was just emailed to <strong>${escHtml(card.recipient_email)}</strong>. Here’s a copy for your records.`,
        }
        : {
          fr, showMessage: true,
          headline: fr ? "Votre carte-cadeau est prête" : "Your gift card is ready",
          intro: fr
            ? `Merci! Votre carte-cadeau${escHtml(forWho)} est prête à offrir : transférez ce courriel ou partagez simplement le code.`
            : `Thank you! Your gift card${escHtml(forWho)} is ready to give: forward this email or just share the code.`,
        }),
    );
  }

  await sendEmail(
    OWNER_EMAIL,
    `Gift card ${card.source === "online" ? "sold online" : "issued"} — ${money(card.initial_cents, false)} — ${card.code}`,
    [
      `Gift card ${card.code} is active (${card.source}).`,
      `Amount: ${money(card.initial_cents, false)}`,
      `Purchaser: ${card.purchaser_name || "(none)"} ${card.purchaser_email ? `<${card.purchaser_email}>` : ""}`,
      `Recipient: ${card.recipient_name || "(none)"} ${card.recipient_email ? `<${card.recipient_email}>` : ""}`,
      `Delivered to: ${toRecipient ? "recipient" : (card.purchaser_email ? "purchaser" : "nobody (no email given)")}`,
      `Message: ${card.message || "(none)"}`,
    ].join("\n"),
  );
}

// Exactly one caller (browser confirm, webhook, or the owner) gets to send
// a card's emails: the one whose conditional update stamps delivered_at.
async function claimDelivery(cardId: string): Promise<boolean> {
  const { data, error } = await supabase.from("gift_cards")
    .update({ delivered_at: new Date().toISOString() })
    .eq("id", cardId).eq("status", "active").is("delivered_at", null)
    .select("id");
  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length === 1;
}

async function activate(cardId: string): Promise<{ card: GiftCard; justActivated: boolean }> {
  const { data: before } = await supabase.from("gift_cards").select("status").eq("id", cardId).single();
  const { data, error } = await supabase.rpc("activate_gift_card", { p_card: cardId });
  if (error) throw new Error(error.message);
  return { card: data as GiftCard, justActivated: before?.status === "pending_payment" };
}

function readCardFields(body: Record<string, unknown>) {
  return {
    purchaser_name: clean(body.purchaser_name, 120) || null,
    purchaser_email: clean(body.purchaser_email, 254).toLowerCase() || null,
    recipient_name: clean(body.recipient_name, 120) || null,
    recipient_email: clean(body.recipient_email, 254).toLowerCase() || null,
    message: clean(body.message, 500) || null,
    lang: body.lang === "fr" ? "fr" : "en",
  };
}

async function handleCheck(req: Request, body: Record<string, unknown>) {
  const blocked = await limitGuard(req, "gift_check", 20, 600);
  if (blocked) return blocked;
  const code = normalizeCode(body.code);
  if (!code) return json({ ok: true, valid: false });
  const { data } = await supabase
    .from("gift_cards").select("balance_cents, status").eq("code", code).maybeSingle();
  if (!data || data.status !== "active") return json({ ok: true, valid: false });
  return json({ ok: true, valid: true, code, balance_cents: data.balance_cents });
}

async function handlePurchase(req: Request, body: Record<string, unknown>) {
  if (!stripe) return json({ ok: false, error: "stripe_not_configured" }, 503);
  if (clean(body.company, 200)) return json({ ok: false, error: "rejected" }, 400);
  const blocked = await limitGuard(req, "gift_purchase", 8, 120);
  if (blocked) return blocked;

  const amount = Number(body.amount_cents);
  if (!Number.isInteger(amount) || amount < 2500 || amount > 100000 || amount % 100 !== 0) {
    return json({ ok: false, error: "invalid_amount" }, 400);
  }
  const fields = readCardFields(body);
  const deliverTo = body.deliver_to === "purchaser" ? "purchaser" : "recipient";
  if (!fields.purchaser_name || !fields.purchaser_email || !isEmail(fields.purchaser_email)) {
    return json({ ok: false, error: "invalid_purchaser" }, 400);
  }
  if (fields.recipient_email && !isEmail(fields.recipient_email)) {
    return json({ ok: false, error: "invalid_recipient_email" }, 400);
  }
  if (deliverTo === "recipient" && !fields.recipient_email) {
    return json({ ok: false, error: "recipient_email_required" }, 400);
  }

  const { data: card, error } = await supabase.from("gift_cards").insert({
    ...fields,
    initial_cents: amount,
    source: "online",
    deliver_to: deliverTo,
  }).select().single();
  if (error || !card) throw new Error(error?.message ?? "Could not create gift card.");

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: "cad",
    automatic_payment_methods: { enabled: true },
    description: `Magicstick Clean gift card (${money(amount, false)})`,
    metadata: { kind: "gift_card", gift_card_id: card.id },
    receipt_email: fields.purchaser_email,
  });
  await supabase.from("gift_cards").update({ stripe_payment_intent_id: intent.id }).eq("id", card.id);

  return json({ ok: true, client_secret: intent.client_secret, gift_card_id: card.id, amount_cents: amount });
}

async function handleIssue(req: Request, body: Record<string, unknown>) {
  if (!(await requireAdmin(req))) return json({ ok: false, error: "unauthorized" }, 401);
  const amount = Number(body.amount_cents);
  if (!Number.isInteger(amount) || amount < 500 || amount > 200000) {
    return json({ ok: false, error: "invalid_amount" }, 400);
  }
  const fields = readCardFields(body);
  if (fields.recipient_email && !isEmail(fields.recipient_email)) return json({ ok: false, error: "invalid_recipient_email" }, 400);
  if (fields.purchaser_email && !isEmail(fields.purchaser_email)) return json({ ok: false, error: "invalid_purchaser_email" }, 400);
  const requestId = clean(body.request_id, 64) || null;

  const { data: pending, error } = await supabase.from("gift_cards").insert({
    ...fields,
    initial_cents: amount,
    source: "manual",
    deliver_to: fields.recipient_email ? "recipient" : "purchaser",
    request_id: requestId,
  }).select().single();
  if (error || !pending) throw new Error(error?.message ?? "Could not create gift card.");

  const { card } = await activate(pending.id);
  if (requestId) await supabase.from("gift_card_requests").update({ status: "delivered" }).eq("id", requestId);
  if (body.send_email !== false && await claimDelivery(card.id)) await deliverEmails(card);
  return json({ ok: true, gift_card: card });
}

async function handleVoid(req: Request, body: Record<string, unknown>) {
  if (!(await requireAdmin(req))) return json({ ok: false, error: "unauthorized" }, 401);
  const id = clean(body.gift_card_id, 64);
  const { error } = await supabase.from("gift_cards")
    .update({ status: "void", updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "active");
  if (error) throw new Error(error.message);
  return json({ ok: true });
}

async function handleDeliver(req: Request, body: Record<string, unknown>) {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token || token !== SERVICE_ROLE_KEY) return json({ ok: false, error: "unauthorized" }, 401);
  const { card } = await activate(clean(body.gift_card_id, 64));
  // A retried webhook (or one arriving after the browser's confirm) finds the
  // card already delivered — nobody gets the email twice.
  const sent = card.status === "active" && await claimDelivery(card.id);
  if (sent) await deliverEmails(card);
  return json({ ok: true, code: card.code, already: !sent });
}

// Called by the page right after Stripe says the payment went through (or
// when the buyer comes back from a 3-D Secure redirect). The page's word is
// never enough: the PaymentIntent is read from Stripe and must have
// succeeded, for this card, for the card's exact amount, in CAD.
async function handleConfirm(req: Request, body: Record<string, unknown>) {
  if (!stripe) return json({ ok: false, error: "stripe_not_configured" }, 503);
  const blocked = await limitGuard(req, "gift_confirm", 20, 600);
  if (blocked) return blocked;
  const intentId = clean(body.payment_intent, 64);
  if (!/^pi_[A-Za-z0-9_]{6,60}$/.test(intentId)) return json({ ok: false, error: "invalid_payment" }, 400);

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(intentId);
  } catch (_) {
    return json({ ok: false, error: "invalid_payment" }, 400);
  }
  const cardId = intent.metadata?.kind === "gift_card" ? intent.metadata.gift_card_id : null;
  if (!cardId) return json({ ok: false, error: "invalid_payment" }, 400);
  if (intent.status === "processing") return json({ ok: true, status: "processing" });
  if (intent.status !== "succeeded") return json({ ok: false, error: "not_paid", status: intent.status }, 409);

  const { data: pending } = await supabase.from("gift_cards")
    .select("id, initial_cents, stripe_payment_intent_id").eq("id", cardId).maybeSingle();
  if (!pending || pending.stripe_payment_intent_id !== intent.id
    || pending.initial_cents !== intent.amount_received || intent.currency !== "cad") {
    console.error("gift card confirm mismatch", cardId, intent.id);
    return json({ ok: false, error: "invalid_payment" }, 400);
  }

  const { card } = await activate(cardId);
  if (card.status !== "active") return json({ ok: false, error: "not_active" }, 409);
  if (await claimDelivery(card.id)) await deliverEmails(card);
  return json({ ok: true, status: "delivered", deliver_to: card.deliver_to });
}

Deno.serve(async (req) => withCors(req, rejectForeignOrigin(req) ?? await handle(req)));

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const text = await readLimitedBody(req, MAX_BODY_BYTES);
    if (text === null) return json({ ok: false, error: "payload_too_large" }, 413);
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ ok: false, error: "invalid_body" }, 400);
    const body = parsed as Record<string, unknown>;
    switch (body.action) {
      case "check": return await handleCheck(req, body);
      case "purchase": return await handlePurchase(req, body);
      case "confirm": return await handleConfirm(req, body);
      case "issue": return await handleIssue(req, body);
      case "void": return await handleVoid(req, body);
      case "deliver": return await handleDeliver(req, body);
      default: return json({ ok: false, error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "server_error" }, 500);
  }
}
