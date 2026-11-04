// quote-pay + stripe-webhook (kind "quote"): the price always comes from the
// database, codes are validated, card payment stays off unless switched on,
// and a paid quote is marked once.
// deno-lint-ignore-file no-explicit-any
import assert from "node:assert/strict";
import { state } from "./fake_supabase.ts";
import { stripeState } from "./fake_stripe.ts";
import { emails, installFetch, loadHandler, resetAll } from "./harness.ts";

installFetch();
const pay = await loadHandler("../quote-pay/index.ts");
const hook = await loadHandler("../stripe-webhook/index.ts");
const CODE = "ABCDEFGH23";

function seed(extra: Record<string, unknown> = {}) {
  resetAll();
  stripeState.reset();
  state.table("quote_requests").push({
    id: "q1", name: "Ana Roy", service: "Deep Cleaning", email: "ana@example.com", lang: "fr",
    quoted_amount_cents: 25000, quote_note: "3 chambres", pay_code: CODE, paid_at: null,
    stripe_payment_intent_id: null, ...extra,
  });
}
async function call(body: unknown) {
  const res = await pay(new Request("https://functions.test/quote-pay", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://magicstickclean.ca" },
    body: JSON.stringify(body),
  }));
  return { status: res.status, json: await res.json() as any };
}

Deno.test("get returns the quote details without card payment by default", async () => {
  seed();
  Deno.env.delete("QUOTE_CARD_PAYMENTS");
  const r = await call({ action: "get", code: "abcd-efgh-23" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { first_name: "Ana", service: "Deep Cleaning", amount_cents: 25000, note: "3 chambres", paid: false, card: false, lang: "fr" });
});

Deno.test("bad or unknown codes are refused", async () => {
  seed();
  assert.equal((await call({ action: "get", code: "short" })).status, 400);
  assert.equal((await call({ action: "get", code: "ZZZZZZZZZZ" })).status, 404);
  seed({ quoted_amount_cents: null });
  assert.equal((await call({ action: "get", code: CODE })).status, 404);
});

Deno.test("intent is refused while card payment is off", async () => {
  seed();
  Deno.env.delete("QUOTE_CARD_PAYMENTS");
  const r = await call({ action: "intent", code: CODE });
  assert.equal(r.status, 409);
  assert.equal(r.json.error, "card_unavailable");
  assert.equal(stripeState.intents.length, 0);
});

Deno.test("intent charges exactly the quoted amount and is reused", async () => {
  seed();
  Deno.env.set("QUOTE_CARD_PAYMENTS", "on");
  try {
    const r = await call({ action: "intent", code: CODE, amount_cents: 1 });
    assert.equal(r.status, 200);
    assert.equal(stripeState.intents[0].amount, 25000);
    assert.equal(stripeState.intents[0].currency, "cad");
    assert.equal(stripeState.intents[0].metadata.kind, "quote");
    assert.equal(state.table("quote_requests")[0].stripe_payment_intent_id, "pi_test_1");
    const again = await call({ action: "intent", code: CODE });
    assert.equal(again.json.client_secret, r.json.client_secret);
    assert.equal(stripeState.intents.length, 1);
  } finally {
    Deno.env.delete("QUOTE_CARD_PAYMENTS");
  }
});

Deno.test("a paid quote cannot be paid twice", async () => {
  seed({ paid_at: "2026-11-04T10:00:00Z" });
  Deno.env.set("QUOTE_CARD_PAYMENTS", "on");
  try {
    assert.equal((await call({ action: "intent", code: CODE })).status, 409);
    assert.equal((await call({ action: "get", code: CODE })).json.paid, true);
  } finally {
    Deno.env.delete("QUOTE_CARD_PAYMENTS");
  }
});

async function deliver(intent: any) {
  const res = await hook(new Request("https://functions.test/stripe-webhook", {
    method: "POST", headers: { "Stripe-Signature": "valid" },
    body: JSON.stringify({ type: "payment_intent.succeeded", data: { object: intent } }),
  }));
  return res.status;
}

Deno.test("webhook marks the quote paid once and emails owner and client", async () => {
  seed();
  const intent = { id: "pi_q", amount: 25000, amount_received: 25000, metadata: { kind: "quote", quote_id: "q1" } };
  assert.equal(await deliver(intent), 200);
  const q = state.table("quote_requests")[0];
  assert.ok(q.paid_at);
  assert.equal(q.payment_method, "card");
  assert.equal(emails.length, 2);
  assert.match(emails[0].subject, /Paiement reçu/);
  assert.match(emails[1].subject, /paiement reçu/);
  const first = q.paid_at;
  assert.equal(await deliver(intent), 200);
  assert.equal(state.table("quote_requests")[0].paid_at, first);
  assert.equal(emails.length, 2);
});

Deno.test("webhook does not mark an underpaid quote", async () => {
  seed();
  assert.equal(await deliver({ id: "pi_q", amount: 100, amount_received: 100, metadata: { kind: "quote", quote_id: "q1" } }), 200);
  assert.equal(state.table("quote_requests")[0].paid_at, null);
  assert.match(emails[0].subject, /à vérifier/);
});
