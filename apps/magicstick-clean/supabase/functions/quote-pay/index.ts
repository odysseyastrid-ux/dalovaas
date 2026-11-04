// Pay a personalized quote (pay.html?code=XXXXXXXXXX).
//
// The owner sets the price on a quote in the dashboard (admin.js), which also
// writes a random 10-character pay_code. This public function:
//   action "get"    { code } -> what the client is paying for (first name,
//                   service, amount, note, already paid?) and whether card
//                   payment is available;
//   action "intent" { code } -> a Stripe PaymentIntent for exactly the quoted
//                   amount (read from the database, never from the browser),
//                   returning its client_secret for the Payment Element.
//   action "book_standard" { name, phone/email, address, zone, date, time,
//                   hours, … } -> a Standard Cleaning booked and priced
//                   here (rate from the services table, floor $39.50/h, 3 to
//                   8 hours), saved as a quote with a pay_code; the page then
//                   opens pay.html?code=… to pay right away;
//   action "send_link" { quote_id } + admin JWT -> emails the client their
//                   price and payment link (from the dashboard).
// The quote is marked paid only by stripe-webhook (metadata.kind = "quote").
//
// Card payment is ON when STRIPE_SECRET_KEY is set, unless the secret
// QUOTE_CARD_PAYMENTS = "off" (kill switch). Interac is always offered.
//
// Codes are unguessable (32^10) and lookups are rate limited per visitor and
// globally, failing closed.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { checkLimits, readLimitedBody, withCors, rejectForeignOrigin, logResendError } from "./guard.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const cardOn = () => Deno.env.get("QUOTE_CARD_PAYMENTS") !== "off" && !!STRIPE_KEY;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "magicstickclean@gmail.com";
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "noreply@magicstickclean.ca";
const SITE = "https://magicstickclean.ca";
export const MIN_RATE_CENTS = 3950;
// First cleaning: 20% off (owner's offer, Nov 4, 2026), once per client (phone or email
// that never paid a quote before).
export const FIRST_CLEAN_DISCOUNT = 0.2;
const PAY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const TIME_WINDOWS = ["Morning (8am–11am)", "Midday (11am–2pm)", "Afternoon (2pm–5pm)"];
const ZONES = ["Rockland-Orléans", "Ottawa-Gatineau", "Other"];
const FREQUENCIES = ["One-time", "Weekly", "Biweekly", "Monthly"];
let stripe: Stripe | null = null;
function stripeClient(): Stripe {
  stripe ??= new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });
  return stripe;
}

export const CODE_RE = /^[A-HJ-NP-Z2-9]{10}$/;
const REUSABLE = new Set(["requires_payment_method", "requires_confirmation", "requires_action"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}

function newPayCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => PAY_ALPHABET[b % 32]).join("");
}
const prettyCode = (c: string) => c.replace(/^(.{4})(.{4})(.{2})$/, "$1-$2-$3");
const cad = (cents: number, lang: string) =>
  new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 200;
const isPhone = (v: string) => (v.replace(/\D/g, "").length >= 10) && v.length <= 40;
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

async function sendEmail(to: string, subject: string, text: string, replyTo?: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) { await logResendError(res); return false; }
    return true;
  } catch (err) {
    console.error("Resend request failed:", (err as Error).name);
    return false;
  }
}

export function priceMessage(q: { name: string; service: string; quoted_amount_cents: number; quote_note?: string | null; pay_code: string; lang?: string | null }) {
  const fr = q.lang !== "en";
  const first = String(q.name ?? "").trim().split(/\s+/)[0] ?? "";
  const link = `${SITE}/pay.html?code=${q.pay_code}`;
  const note = q.quote_note ? `\n${q.quote_note}` : "";
  return fr
    ? { subject: "Votre prix Magicstick Clean",
        text: `Bonjour ${first},\n\nMerci pour votre demande ! Votre prix pour ${q.service} : ${cad(q.quoted_amount_cents, "fr")}.${note}\n\n` +
          `Pour accepter et payer (carte ou virement Interac) : ${link}\nCode de paiement : ${prettyCode(q.pay_code)}\n\n` +
          `Vous pouvez aussi payer le jour du ménage. Une question ? Répondez à ce courriel ou appelez le (343) 843-7761.\n\n— Magicstick Clean` }
    : { subject: "Your Magicstick Clean price",
        text: `Hi ${first},\n\nThanks for your request! Your price for ${q.service}: ${cad(q.quoted_amount_cents, "en")}.${note}\n\n` +
          `To accept and pay (card or Interac e-Transfer): ${link}\nPayment code: ${prettyCode(q.pay_code)}\n\n` +
          `You can also pay on the day of the cleaning. Questions? Reply to this email or call (343) 843-7761.\n\n— Magicstick Clean` };
}

async function sendLink(req: Request, body: Record<string, unknown>): Promise<Response> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  const uid = auth?.user?.id;
  if (!uid) return json({ error: "unauthorized" }, 401);
  const { data: admin } = await supabase.from("admin_users").select("id").eq("id", uid).maybeSingle();
  if (!admin) return json({ error: "forbidden" }, 403);
  const id = str(body.quote_id, 60);
  const { data: q, error } = await supabase.from("quote_requests")
    .select("id, name, service, email, contact, lang, quoted_amount_cents, quote_note, pay_code").eq("id", id).maybeSingle();
  if (error) return json({ error: "unavailable" }, 503);
  if (!q || !q.quoted_amount_cents || !q.pay_code) return json({ error: "no_price" }, 404);
  const to = [q.email, q.contact].map((v) => String(v ?? "").trim()).find(isEmail);
  if (!to) return json({ error: "no_email" }, 422);
  const m = priceMessage(q);
  const sent = await sendEmail(to, m.subject, m.text, OWNER_EMAIL);
  if (!sent) return json({ error: "email_failed" }, 502);
  await supabase.from("quote_requests").update({ quoted_at: new Date().toISOString() }).eq("id", q.id);
  return json({ ok: true, to });
}

export function hoursOk(h: number) { return Number.isFinite(h) && h >= 3 && h <= 8 && Math.round(h * 2) === h * 2; }

async function bookStandard(req: Request, body: Record<string, unknown>): Promise<Response> {
  if (str(body.website, 200)) return json({ code: null, ok: true }); // honeypot: pretend, save nothing
  const name = str(body.name, 120);
  const phone = str(body.phone, 40);
  const email = str(body.email, 200);
  const address = str(body.address, 300);
  const zone = str(body.zone, 80);
  const date = str(body.preferred_date, 10);
  const time = str(body.preferred_time, 40);
  const hours = Number(body.hours);
  const message = str(body.message, 2000);
  const lang = body.lang === "en" ? "en" : "fr";
  const frequency = FREQUENCIES.includes(str(body.frequency, 20)) ? str(body.frequency, 20) : "One-time";
  if (!name) return json({ error: "invalid_name" }, 400);
  if (phone && !isPhone(phone)) return json({ error: "invalid_phone" }, 400);
  if (email && !isEmail(email)) return json({ error: "invalid_email" }, 400);
  if (!phone && !email) return json({ error: "invalid_contact" }, 400);
  if (!address) return json({ error: "invalid_address" }, 400);
  if (!ZONES.includes(zone)) return json({ error: "invalid_zone" }, 400);
  if (!TIME_WINDOWS.includes(time)) return json({ error: "invalid_time" }, 400);
  if (!hoursOk(hours)) return json({ error: "invalid_hours" }, 400);
  const today = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10); // Eastern-ish
  const max = new Date(Date.now() + 180 * 86400_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= today || date > max) return json({ error: "invalid_date" }, 400);

  const limit = await checkLimits(supabase, req, "book_standard", [
    { scope: "ip", windowSeconds: 3600, max: 5 },
    { scope: "key", id: (email || phone).toLowerCase(), windowSeconds: 3600, max: 3 },
    { scope: "global", windowSeconds: 3600, max: 60 },
  ]);
  if (limit === "error") return json({ error: "unavailable" }, 503);
  if (limit === "limited") return json({ error: "rate_limited" }, 429);

  const { data: sv, error: svErr } = await supabase.from("services")
    .select("base_price_cents, duration_minutes, active").eq("id", "standard").maybeSingle();
  if (svErr || !sv || !sv.active) return json({ error: "unavailable" }, 503);
  const rate = Math.max(MIN_RATE_CENTS, Math.round(sv.base_price_cents / ((sv.duration_minutes || 180) / 60)));
  // Returning client = this phone or email already paid a quote.
  let returning = false;
  for (const [col, val] of [["phone", phone], ["email", email]] as const) {
    if (!val || returning) continue;
    const { data: prev } = await supabase.from("quote_requests").select("id")
      .eq(col, val).not("paid_at", "is", null).limit(1);
    returning = !!(prev && prev.length);
  }
  const fullAmount = Math.round(rate * hours);
  const amount = returning ? fullAmount : Math.round(fullAmount * (1 - FIRST_CLEAN_DISCOUNT));
  const hoursTxt = String(hours).replace(".", lang === "fr" ? "," : ".");
  const promo = returning ? "" : (lang === "fr" ? ` Rabais premier ménage −20 % inclus (prix régulier ${cad(fullAmount, "fr")}).` : ` First-cleaning 20% off included (regular price ${cad(fullAmount, "en")}).`);
  const note = (lang === "fr" ? `Ménage standard de ${hoursTxt} h, le ${date} (${time}).` : `Standard cleaning, ${hoursTxt} h, on ${date} (${time}).`) + promo;
  let code = "";
  let row: { id: string } | null = null;
  for (let i = 0; i < 3 && !row; i++) {
    code = newPayCode();
    const { data, error } = await supabase.from("quote_requests").insert({
      name, contact: phone || email, phone: phone || null, email: email || null, address, zone,
      service: "Standard Cleaning", frequency, preferred_date: date, preferred_time: time,
      message, source: "booking", lang, status: "new",
      quoted_amount_cents: amount, quote_note: note, quoted_at: new Date().toISOString(), pay_code: code,
    }).select("id").single();
    if (error && error.code !== "23505") { console.error("book_standard insert failed:", error.message); return json({ error: "unavailable" }, 503); }
    row = data;
  }
  if (!row) return json({ error: "unavailable" }, 503);
  await sendEmail(OWNER_EMAIL, `Réservation en ligne : ménage standard (${name})`, [
    `${name} a réservé un ménage standard en ligne.`, "",
    `Date souhaitée : ${date} (${time})`, `Fréquence : ${({ "One-time": "une fois", Weekly: "chaque semaine", Biweekly: "aux deux semaines", Monthly: "chaque mois" } as Record<string, string>)[frequency]}`, `Durée : ${hoursTxt} h`, `Prix : ${cad(amount, "fr")}${returning ? "" : ` (−20 % premier ménage, prix régulier ${cad(fullAmount, "fr")})`}`,
    `Téléphone : ${phone || "Non précisé"}`, `Courriel : ${email || "Non précisé"}`,
    `Adresse : ${address}`, `Zone : ${zone}`, `Langue du client : ${lang === "fr" ? "français" : "anglais"}`, "",
    "Message :", message || "(aucun)", "",
    "Le client est envoyé vers la page de paiement. Vous recevrez un courriel « Paiement reçu » s'il paie par carte.",
    "Confirmez la date avec lui : https://magicstickclean.ca/admin.html",
  ].join("\n"), email || undefined);
  if (email) {
    const m = priceMessage({ name, service: lang === "fr" ? "Ménage standard" : "Standard cleaning", quoted_amount_cents: amount, quote_note: note, pay_code: code, lang });
    await sendEmail(email, lang === "fr" ? "Magicstick Clean : votre réservation" : "Magicstick Clean: your booking", m.text, OWNER_EMAIL);
  }
  return json({ ok: true, code, first_discount: !returning });
}

Deno.serve(async (req) => withCors(req, rejectForeignOrigin(req) ?? await handle(req)));

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const raw = await readLimitedBody(req, 8_000);
  if (raw === null) return json({ error: "too_large" }, 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "invalid_json" }, 400);
  if (body.action === "book_standard") return await bookStandard(req, body);
  if (body.action === "send_link") return await sendLink(req, body);
  const action = body.action === "intent" ? "intent" : body.action === "get" ? "get" : null;
  if (!action) return json({ error: "invalid_action" }, 400);
  const code = String(body.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!CODE_RE.test(code)) return json({ error: "invalid_code" }, 400);

  const limit = await checkLimits(supabase, req, `quote_pay_${action}`, [
    { scope: "ip", windowSeconds: 600, max: action === "get" ? 30 : 10 },
    { scope: "global", windowSeconds: 60, max: 300 },
  ]);
  if (limit === "error") return json({ error: "unavailable" }, 503);
  if (limit === "limited") return json({ error: "rate_limited" }, 429);

  const { data: q, error } = await supabase
    .from("quote_requests")
    .select("id, name, service, quoted_amount_cents, quote_note, paid_at, lang, stripe_payment_intent_id")
    .eq("pay_code", code)
    .maybeSingle();
  if (error) {
    console.error("quote-pay lookup failed:", error.message);
    return json({ error: "unavailable" }, 503);
  }
  if (!q || !q.quoted_amount_cents) return json({ error: "not_found" }, 404);

  if (action === "get") {
    return json({
      first_name: String(q.name ?? "").trim().split(/\s+/)[0] ?? "",
      service: q.service,
      amount_cents: q.quoted_amount_cents,
      note: q.quote_note ?? "",
      paid: !!q.paid_at,
      card: cardOn(),
      lang: q.lang === "fr" ? "fr" : "en",
    });
  }

  if (q.paid_at) return json({ error: "already_paid" }, 409);
  if (!cardOn()) return json({ error: "card_unavailable" }, 409);

  try {
    const s = stripeClient();
    if (q.stripe_payment_intent_id) {
      const existing = await s.paymentIntents.retrieve(q.stripe_payment_intent_id);
      if (REUSABLE.has(existing.status) && existing.amount === q.quoted_amount_cents) {
        return json({ client_secret: existing.client_secret });
      }
    }
    const pi = await s.paymentIntents.create({
      amount: q.quoted_amount_cents,
      currency: "cad",
      automatic_payment_methods: { enabled: true },
      description: `Magicstick Clean: ${q.service}`,
      metadata: { kind: "quote", quote_id: q.id },
    }, { idempotencyKey: `quote-${q.id}-${q.quoted_amount_cents}` });
    const { error: saveError } = await supabase
      .from("quote_requests").update({ stripe_payment_intent_id: pi.id }).eq("id", q.id);
    if (saveError) console.error("quote-pay could not save intent id:", saveError.message);
    return json({ client_secret: pi.client_secret });
  } catch (err) {
    console.error("quote-pay Stripe error:", (err as Error).name);
    return json({ error: "payment_unavailable" }, 502);
  }
}
