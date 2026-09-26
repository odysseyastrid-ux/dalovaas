// Gift cards: balance check, online purchase, owner-issued cards, and
// delivery (activating a paid card and emailing its code).
//
// Actions (POST { action, ... }):
//   check     public — { code } → { valid, balance_cents }        (rate-limited)
//   purchase  public — creates a pending card + Stripe PaymentIntent,
//             returns client_secret; the card is activated by stripe-webhook
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
import Stripe from "npm:stripe@14";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE_KEY);

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) : null;

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

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set — skipping email send.");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, reply_to: OWNER_EMAIL, subject, text }),
  });
  if (!res.ok) console.error("Resend error:", res.status, await res.text());
}

async function hashIp(req: Request): Promise<string> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`magicstick:${ip}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isRateLimited(req: Request, form: string, max: number): Promise<boolean> {
  const ipHash = await hashIp(req);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("form_submission_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("form", form)
    .gte("created_at", since);
  if ((count ?? 0) >= max) return true;
  await supabase.from("form_submission_log").insert({ ip_hash: ipHash, form });
  return false;
}

async function requireAdmin(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return false;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: admin } = await supabase.from("admin_users").select("id").eq("id", data.user.id).maybeSingle();
  return Boolean(admin);
}

function howToUse(fr: boolean) {
  return fr
    ? `Comment l’utiliser : réserve en ligne sur ${SITE}/booking.html et entre ce code dans le champ « Carte-cadeau » — le solde est appliqué automatiquement. Tu peux aussi appeler ou texter le 343-843-7761 et mentionner ton code. Le solde restant demeure sur la carte pour ton prochain ménage, et la carte n’expire jamais.\n\nVérifie ton solde en tout temps : ${SITE}/gift-cards.html#balance`
    : `How to use it: book online at ${SITE}/booking.html and enter this code in the "Gift card" field — the balance is applied automatically. You can also call or text 343-843-7761 and mention your code. Any unused balance stays on the card for your next cleaning, and it never expires.\n\nCheck your balance anytime: ${SITE}/gift-cards.html#balance`;
}

// Emails the card to whoever should receive it, a copy/receipt to the
// purchaser when it went to someone else, and a heads-up to the owner.
async function deliverEmails(card: GiftCard) {
  const fr = card.lang === "fr";
  const amount = money(card.initial_cents, fr);
  const note = card.message ? (fr ? `\nMessage : « ${card.message} »\n` : `\nMessage: "${card.message}"\n`) : "";
  const from = card.purchaser_name ? card.purchaser_name : (fr ? "Quelqu’un" : "Someone");
  const toRecipient = card.deliver_to === "recipient" && card.recipient_email;

  if (toRecipient) {
    await sendEmail(
      card.recipient_email!,
      fr ? `${from} t’offre une carte-cadeau Magicstick Clean` : `${from} sent you a Magicstick Clean gift card`,
      fr
        ? `Bonjour ${card.recipient_name || ""},\n\n${from} t’offre une carte-cadeau Magicstick Clean de ${amount} — un ménage professionnel pour ta maison!\n${note}\nCode de la carte-cadeau : ${card.code}\n\n${howToUse(true)}\n\n${SIGNATURE_FR}`
        : `Hi ${card.recipient_name || "there"},\n\n${from} sent you a ${amount} Magicstick Clean gift card — a professional clean for your home!\n${note}\nGift card code: ${card.code}\n\n${howToUse(false)}\n\n${SIGNATURE_EN}`,
    );
  }

  if (card.purchaser_email) {
    const forWho = card.recipient_name ? (fr ? ` pour ${card.recipient_name}` : ` for ${card.recipient_name}`) : "";
    await sendEmail(
      card.purchaser_email,
      fr ? `Ta carte-cadeau Magicstick Clean de ${amount}` : `Your ${amount} Magicstick Clean gift card`,
      toRecipient
        ? (fr
          ? `Bonjour ${card.purchaser_name || ""},\n\nMerci! Ta carte-cadeau de ${amount}${forWho} a été envoyée par courriel à ${card.recipient_email}.\n\nPour tes dossiers, le code est : ${card.code}\n\n${SIGNATURE_FR}`
          : `Hi ${card.purchaser_name || "there"},\n\nThank you! Your ${amount} gift card${forWho} was emailed to ${card.recipient_email}.\n\nFor your records, the code is: ${card.code}\n\n${SIGNATURE_EN}`)
        : (fr
          ? `Bonjour ${card.purchaser_name || ""},\n\nMerci! Voici ta carte-cadeau Magicstick Clean de ${amount}${forWho}, prête à offrir — transfère ce courriel ou partage simplement le code.\n${note}\nCode de la carte-cadeau : ${card.code}\n\n${howToUse(true)}\n\n${SIGNATURE_FR}`
          : `Hi ${card.purchaser_name || "there"},\n\nThank you! Here's your ${amount} Magicstick Clean gift card${forWho}, ready to give — forward this email or just share the code.\n${note}\nGift card code: ${card.code}\n\n${howToUse(false)}\n\n${SIGNATURE_EN}`),
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
  if (await isRateLimited(req, "gift_check", 20)) return json({ ok: false, error: "rate_limited" }, 429);
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
  if (await isRateLimited(req, "gift_purchase", 8)) return json({ ok: false, error: "rate_limited" }, 429);

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
  if (body.send_email !== false) await deliverEmails(card);
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
  const { card, justActivated } = await activate(clean(body.gift_card_id, 64));
  // A retried Stripe webhook finds the card already active — don't re-send.
  if (justActivated && card.status === "active") await deliverEmails(card);
  return json({ ok: true, code: card.code, already: !justActivated });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  try {
    const body = await req.json() as Record<string, unknown>;
    switch (body.action) {
      case "check": return await handleCheck(req, body);
      case "purchase": return await handlePurchase(req, body);
      case "issue": return await handleIssue(req, body);
      case "void": return await handleVoid(req, body);
      case "deliver": return await handleDeliver(req, body);
      default: return json({ ok: false, error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
