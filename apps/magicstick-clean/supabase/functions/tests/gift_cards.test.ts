// Gift cards bought by card on gift-cards.html: the page asks the function to
// "confirm" once Stripe accepted the payment. The function must re-read the
// PaymentIntent from Stripe (never trust the page), activate the card once,
// and send the emails exactly once even if the webhook also delivers.
// deno-lint-ignore-file no-explicit-any
import assert from "node:assert/strict";
import { state } from "./fake_supabase.ts";
import { stripeState } from "./fake_stripe.ts";
import { emails, installFetch, jwt, loadHandler, post, resetAll } from "./harness.ts";

installFetch();
const giftCards = await loadHandler("../gift-cards/index.ts");

async function call(body: unknown, headers: Record<string, string> = {}) {
  const res = await giftCards(post(body, headers));
  return { status: res.status, json: await res.json() as any };
}

function setup() {
  resetAll();
  // activate_gift_card: pending -> active with a code (the real one is SQL).
  state.rpcHandlers.activate_gift_card = ({ p_card }: any) => {
    const card = state.table("gift_cards").find((c: any) => c.id === p_card);
    if (card && (card.status ?? "pending_payment") === "pending_payment") {
      Object.assign(card, { status: "active", code: "MSC-ABCD-EFGH-JKLM", balance_cents: card.initial_cents });
    }
    return { data: card ?? null, error: null };
  };
}

async function buy(extra: Record<string, unknown> = {}) {
  const r = await call({
    action: "purchase", amount_cents: 10000, purchaser_name: "Ana", purchaser_email: "ana@example.com",
    recipient_name: "Léo", recipient_email: "leo@example.com", deliver_to: "recipient",
    message: "Bonne crémaillère!", lang: "fr", ...extra,
  });
  assert.equal(r.status, 200);
  const card = state.table("gift_cards")[0];
  card.status ??= "pending_payment"; // the table's default in Postgres
  const pi = stripeState.intents[0];
  return { card, pi };
}

Deno.test("gift card: a paid card is activated and emailed once (refined HTML + text)", async () => {
  setup();
  const { card, pi } = await buy();
  if (!card.id) card.id = "card-1";
  pi.metadata.gift_card_id = card.id;
  card.stripe_payment_intent_id = pi.id;
  Object.assign(pi, { status: "succeeded", amount_received: 10000 });

  const r = await call({ action: "confirm", payment_intent: pi.id });
  assert.equal(r.status, 200);
  assert.equal(r.json.status, "delivered");
  assert.equal(card.status, "active");
  const toLeo = emails.find((e) => e.to === "leo@example.com")!;
  assert.match(toLeo.subject, /Ana vous offre une carte-cadeau/);
  assert.ok(toLeo.text.includes("MSC-ABCD-EFGH-JKLM"));
  assert.ok(toLeo.html && toLeo.html.includes("MSC-ABCD-EFGH-JKLM") && toLeo.html.includes("100,00 $"));
  assert.ok(toLeo.html!.includes("Bonne crémaillère!"));
  assert.ok(emails.some((e) => e.to === "ana@example.com"));
  assert.ok(emails.some((e) => e.to === "owner@example.com"));

  const sent = emails.length;
  const again = await call({ action: "confirm", payment_intent: pi.id });
  assert.equal(again.status, 200);
  const webhook = await call({ action: "deliver", gift_card_id: card.id }, { Authorization: "Bearer service-role-key" });
  assert.equal(webhook.status, 200);
  assert.equal(emails.length, sent, "no second round of emails");
});

Deno.test("gift card: an unpaid or mismatched payment never activates a card", async () => {
  setup();
  const { card, pi } = await buy();
  if (!card.id) card.id = "card-1";
  pi.metadata.gift_card_id = card.id;
  card.stripe_payment_intent_id = pi.id;

  assert.equal((await call({ action: "confirm", payment_intent: pi.id })).status, 409); // not paid yet
  Object.assign(pi, { status: "succeeded", amount_received: 500 });                     // wrong amount
  assert.equal((await call({ action: "confirm", payment_intent: pi.id })).status, 400);
  assert.equal((await call({ action: "confirm", payment_intent: "pi_unknown" })).status, 400);
  assert.equal((await call({ action: "confirm", payment_intent: "not-an-id" })).status, 400);
  assert.equal(card.status, "pending_payment");
  assert.equal(emails.length, 0);
});

Deno.test("gift card: owner actions need the two-step sign-in", async () => {
  setup();
  state.table("admin_users").push({ id: "u-admin" });
  const passwordOnly = jwt("aal1", "u-admin");
  const twoStep = jwt("aal2", "u-admin");
  state.users[passwordOnly] = "u-admin";
  state.users[twoStep] = "u-admin";
  const issue = { action: "issue", amount_cents: 5000, recipient_email: "zoe@example.com", lang: "fr" };
  assert.equal((await call(issue, { Authorization: `Bearer ${passwordOnly}` })).status, 401);
  const ok = await call(issue, { Authorization: `Bearer ${twoStep}` });
  assert.equal(ok.status, 200);
  assert.equal(emails.filter((e) => e.to === "zoe@example.com").length, 1);
});
