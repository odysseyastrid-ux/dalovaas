// Wiring tests for create-payment-intent (audit S01, S04, S05, S06).
// deno-lint-ignore-file no-explicit-any
import assert from "node:assert/strict";
import { state } from "./fake_supabase.ts";
import { stripeState } from "./fake_stripe.ts";
import {
  addGiftCard, bookingBody, emails, futureDate, installFetch, loadHandler, post, resetAll, seedServices,
} from "./harness.ts";

installFetch();
const handler = await loadHandler("../create-payment-intent/index.ts");

async function call(body: unknown, headers: Record<string, string> = {}, raw?: string) {
  const res = await handler(post(body, headers, raw));
  return { status: res.status, json: await res.json() as any };
}
function fresh() { resetAll(); seedServices(); }

Deno.test("S06: a date in the past is refused before anything is written", async () => {
  fresh();
  const r = await call(bookingBody({ requested_date: "2020-01-01" }));
  assert.equal(r.status, 400);
  assert.equal(r.json.error, "date_in_past");
  assert.equal(state.table("bookings").length, 0);
  assert.equal(stripeState.intents.length, 0);
});

Deno.test("S06: an unknown time window is refused", async () => {
  fresh();
  const r = await call(bookingBody({ time_window: "not-a-time-slot" }));
  assert.equal(r.status, 400);
  assert.equal(r.json.error, "invalid_time_window");
  assert.equal(state.table("bookings").length, 0);
});

Deno.test("S06: a 100 000-character note is refused (body too large) and nothing is stored", async () => {
  fresh();
  const r = await call(bookingBody({ notes: "x".repeat(100_000) }));
  assert.equal(r.status, 413);
  assert.equal(r.json.error, "payload_too_large");
  assert.equal(state.table("bookings").length, 0);
});

Deno.test("S06: a note just over the 2000-character limit is refused", async () => {
  fresh();
  const r = await call(bookingBody({ notes: "x".repeat(2001) }));
  assert.equal(r.status, 400);
  assert.equal(r.json.error, "notes_too_long");
});

Deno.test("S06: invalid JSON and non-object bodies get a clean 400", async () => {
  fresh();
  assert.equal((await call(null, {}, "{not json")).json.error, "invalid_json");
  assert.equal((await call([1, 2, 3])).json.error, "invalid_body");
});

Deno.test("S04/S05: over the per-visitor limit -> 429 and nothing is created", async () => {
  fresh();
  for (let i = 0; i < 12; i++) await call(bookingBody({ requested_date: "2020-01-01" })); // cheap, rejected after the limiter
  const r = await call(bookingBody());
  assert.equal(r.status, 429);
  assert.equal(r.json.error, "rate_limited");
  assert.equal(state.table("bookings").length, 0);
  assert.equal(stripeState.intents.length, 0);
});

Deno.test("S05: the limiter FAILS CLOSED when its counter errors (no booking, no Stripe call)", async () => {
  fresh();
  state.rpcHandlers.rate_limit_hit = () => ({ data: null, error: { message: "db down" } });
  const r = await call(bookingBody());
  assert.equal(r.status, 503);
  assert.equal(r.json.error, "temporarily_unavailable");
  assert.equal(state.table("bookings").length, 0);
  assert.equal(stripeState.intents.length, 0);
});

Deno.test("happy path, no gift card: pending booking + PaymentIntent for the full deposit", async () => {
  fresh();
  const r = await call(bookingBody());
  assert.equal(r.status, 200);
  assert.equal(r.json.client_secret, "pi_test_1_secret");
  assert.equal(r.json.deposit_cents, 3000);
  const [b] = state.table("bookings");
  assert.equal(b.status, "pending_payment");
  assert.equal(b.stripe_payment_intent_id, "pi_test_1");
  assert.equal(stripeState.intents[0].amount, 3000);
  assert.equal(stripeState.intents[0].metadata.booking_id, b.id);
});

Deno.test("S01: a gift card that covers the deposit confirms the booking and creates no PaymentIntent", async () => {
  fresh();
  addGiftCard(9000);
  const r = await call(bookingBody({ gift_card_code: "MSC-ABCD-EFGH-JKLM" }));
  assert.equal(r.status, 200);
  assert.equal(r.json.confirmed, true);
  // The card covers up to the whole booking price (90 $), not only the deposit.
  assert.equal(r.json.gift_card_applied_cents, 9000);
  assert.equal(stripeState.intents.length, 0);
  assert.equal(state.table("bookings")[0].status, "confirmed");
  assert.equal(state.table("gift_cards")[0].balance_cents, 0);
  assert.ok(emails.some((e) => e.to === "owner@example.com" && /gift card/i.test(e.subject)));
});

Deno.test("S01: a card drained by another booking in the meantime is NOT treated as covering the deposit", async () => {
  fresh();
  addGiftCard(9000);
  // Another booking takes the whole balance between the page's check and the
  // reservation — the exact race the audit reproduced.
  state.rpcHandlers.reserve_booking_deposit = (a: any) => {
    const booking = state.table("bookings").find((b) => b.id === a.p_booking)!;
    Object.assign(booking, { deposit_cents: a.p_deposit, gift_card_applied_cents: 0, gift_card_planned_cents: 0 });
    return { data: [{ applied_cents: 0, online_due_cents: a.p_deposit, confirmed: false }], error: null };
  };
  const r = await call(bookingBody({ gift_card_code: "MSC-ABCD-EFGH-JKLM" }));
  assert.equal(r.status, 200);
  assert.equal(r.json.confirmed, undefined, "must not be confirmed");
  assert.equal(r.json.client_secret, "pi_test_1_secret");
  assert.equal(stripeState.intents[0].amount, 3000, "the visitor is asked to pay the real amount still due");
  assert.equal(state.table("bookings")[0].status, "pending_payment");
});

Deno.test("S01: a partly covered deposit charges only the remainder", async () => {
  fresh();
  addGiftCard(2000);
  const r = await call(bookingBody({ gift_card_code: "MSC-ABCD-EFGH-JKLM" }));
  assert.equal(r.status, 200);
  assert.equal(r.json.deposit_cents, 1000);
  assert.equal(stripeState.intents[0].amount, 1000);
  assert.equal(state.table("bookings")[0].gift_card_applied_cents, 2000);
});

Deno.test("S01: if the reservation step fails, the booking is released, not left pending", async () => {
  fresh();
  state.rpcHandlers.reserve_booking_deposit = () => ({ data: null, error: { message: "boom" } });
  const r = await call(bookingBody());
  assert.equal(r.status, 500);
  assert.equal(state.table("bookings")[0].status, "cancelled");
  assert.equal(stripeState.intents.length, 0);
});

Deno.test("S06: internal error details are never sent to the visitor", async () => {
  fresh();
  stripeState.failCreate = new Error("sk_live_SECRET internal stripe detail");
  const r = await call(bookingBody());
  assert.equal(r.status, 500);
  assert.deepEqual(r.json, { error: "server_error" });
  assert.equal(state.table("bookings")[0].status, "cancelled", "the half-created booking is released");
});

Deno.test("S04: the same idempotency key returns the same booking instead of a second one", async () => {
  fresh();
  const first = await call(bookingBody({ idempotency_key: "attempt-0001-abcdef" }));
  const again = await call(bookingBody({ idempotency_key: "attempt-0001-abcdef" }));
  assert.equal(again.status, 200);
  assert.equal(again.json.booking_id, first.json.booking_id);
  assert.equal(again.json.client_secret, first.json.client_secret);
  assert.equal(state.table("bookings").length, 1);
  assert.equal(stripeState.intents.length, 1);
});

Deno.test("S04: after a failed attempt the same key starts a fresh booking", async () => {
  fresh();
  stripeState.failCreate = new Error("temporary");
  const failed = await call(bookingBody({ idempotency_key: "attempt-0002-abcdef" }));
  assert.equal(failed.status, 500);
  stripeState.failCreate = null;
  const retry = await call(bookingBody({ idempotency_key: "attempt-0002-abcdef" }));
  assert.equal(retry.status, 200);
  assert.equal(stripeState.intents.length, 1);
});

Deno.test("S04: abandoned pending bookings are cancelled (PaymentIntent cancelled, hold released)", async () => {
  fresh();
  addGiftCard(500);
  state.table("gift_cards")[0].balance_cents = 0;           // 500 is currently held below
  stripeState.intents.push({ id: "pi_old", client_secret: "s", status: "requires_payment_method" });
  state.table("bookings").push({
    id: "old-booking", status: "pending_payment", stripe_payment_intent_id: "pi_old",
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    gift_card_id: "card-1", gift_card_applied_cents: 500,
  });
  await call(bookingBody());
  const old = state.table("bookings").find((b) => b.id === "old-booking")!;
  assert.equal(old.status, "cancelled");
  assert.deepEqual(stripeState.cancelled, ["pi_old"]);
  assert.equal(state.table("gift_cards")[0].balance_cents, 500, "the held amount went back to the card");
});

Deno.test("S04: a booking whose payment is succeeding is NOT expired", async () => {
  fresh();
  stripeState.intents.push({ id: "pi_paid", client_secret: "s", status: "succeeded" });
  state.table("bookings").push({
    id: "paid-booking", status: "pending_payment", stripe_payment_intent_id: "pi_paid",
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  });
  await call(bookingBody());
  assert.equal(state.table("bookings").find((b) => b.id === "paid-booking")!.status, "pending_payment");
});

Deno.test("an unknown service and a bad gift-card code are refused cleanly", async () => {
  fresh();
  assert.equal((await call(bookingBody({ service_id: "nope" }))).json.error, "invalid_service");
  assert.equal((await call(bookingBody({ gift_card_code: "garbage" }))).json.error, "invalid_gift_card");
});

Deno.test("only GET-less methods are served: GET -> 405, OPTIONS -> CORS preflight", async () => {
  fresh();
  const get = await handler(new Request("https://functions.test/fn", { method: "GET" }));
  assert.equal(get.status, 405);
  const opt = await handler(new Request("https://functions.test/fn", { method: "OPTIONS" }));
  assert.equal(opt.status, 200);
  assert.ok(opt.headers.get("Access-Control-Allow-Origin"));
});

Deno.test("far-future and malformed dates are refused", async () => {
  fresh();
  assert.equal((await call(bookingBody({ requested_date: futureDate(400) }))).json.error, "date_too_far");
  assert.equal((await call(bookingBody({ requested_date: "2026-02-31" }))).json.error, "invalid_date");
});
