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
// The quote is marked paid only by stripe-webhook (metadata.kind = "quote").
//
// Card payment is OFF unless the secret QUOTE_CARD_PAYMENTS = "on" (set it,
// like ONLINE_PAYMENTS in js/config.js, only once Stripe is activated and a
// real payment has worked). Meanwhile the page shows Interac e-Transfer.
//
// Codes are unguessable (32^10) and lookups are rate limited per visitor and
// globally, failing closed.

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { checkLimits, readLimitedBody, withCors, rejectForeignOrigin } from "./guard.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const cardOn = () => Deno.env.get("QUOTE_CARD_PAYMENTS") === "on" && !!STRIPE_KEY;
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

Deno.serve(async (req) => withCors(req, rejectForeignOrigin(req) ?? await handle(req)));

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const raw = await readLimitedBody(req, 2_000);
  if (raw === null) return json({ error: "too_large" }, 413);
  let body: { action?: unknown; code?: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
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
