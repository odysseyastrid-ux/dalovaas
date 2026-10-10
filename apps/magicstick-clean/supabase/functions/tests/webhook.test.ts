// stripe-webhook: confirmation is conditional, retried events are harmless,
// payments for cancelled bookings alert the owner, database errors are not
// swallowed (audit S01 follow-up).
// deno-lint-ignore-file no-explicit-any
import assert from "node:assert/strict";
import { state } from "./fake_supabase.ts";
import { emails, installFetch, loadHandler, resetAll } from "./harness.ts";

installFetch();
const handler = await loadHandler("../stripe-webhook/index.ts");

function event(bookingId: string, extra: Record<string, unknown> = {}) {
  return {
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_test_1", metadata: { kind: "booking", booking_id: bookingId }, ...extra } },
  };
}
async function deliver(ev: unknown, signature = "valid") {
  const res = await handler(new Request("https://functions.test/stripe-webhook", {
    method: "POST", headers: { "Stripe-Signature": signature }, body: JSON.stringify(ev),
  }));
  return { status: res.status, json: await res.json().catch(() => null) as any };
}
function seed(status = "pending_payment", extra: Record<string, unknown> = {}) {
  resetAll();
  state.table("bookings").push({
    id: "b1", status, guest_name: "Ana", guest_contact: "ana@example.com", service_id: "standard",
    requested_date: "2030-01-10", time_window: "Morning", amount_cents: 9000, addons_cents: 0,
    deposit_cents: 3000, gift_card_id: null, gift_card_planned_cents: 0, gift_card_applied_cents: 0,
    first_booking_discount_applied: false, notes: "", ...extra,
  });
}

Deno.test("a bad signature is rejected and changes nothing", async () => {
  seed();
  const r = await deliver(event("b1"), "forged");
  assert.equal(r.status, 400);
  assert.equal(state.table("bookings")[0].status, "pending_payment");
});

Deno.test("a paid booking is confirmed once and both emails are sent", async () => {
  seed();
  const r = await deliver(event("b1"));
  assert.equal(r.status, 200);
  assert.equal(state.table("bookings")[0].status, "confirmed");
  assert.ok(state.table("bookings")[0].paid_at);
  assert.equal(emails.length, 2);
});

Deno.test("a retried delivery of the same event does not send the emails again", async () => {
  seed();
  await deliver(event("b1"));
  const before = emails.length;
  const retry = await deliver(event("b1"));
  assert.equal(retry.status, 200);
  assert.equal(emails.length, before, "no duplicate confirmation emails");
});

Deno.test("a payment for a CANCELLED booking alerts the owner and does not revive the booking", async () => {
  seed("cancelled");
  const r = await deliver(event("b1"));
  assert.equal(r.status, 200);
  assert.equal(state.table("bookings")[0].status, "cancelled");
  assert.equal(emails.length, 1);
  assert.match(emails[0].subject, /ACTION NEEDED/);
  assert.equal(emails[0].to, "owner@example.com");
});

Deno.test("a database error is NOT swallowed: 500 so Stripe retries", async () => {
  seed();
  state.failures.add("bookings:update");
  const r = await deliver(event("b1"));
  assert.equal(r.status, 500);
  assert.equal(emails.length, 0);
});

Deno.test("a gift-card amount already held at booking time is not deducted a second time", async () => {
  seed("pending_payment", { gift_card_id: "card-1", gift_card_planned_cents: 2000, gift_card_applied_cents: 2000, deposit_cents: 1000 });
  state.table("gift_cards").push({ id: "card-1", code: "MSC-AAAA-BBBB-CCCC", balance_cents: 0, status: "active" });
  await deliver(event("b1"));
  assert.equal(state.rpcLog.filter((c) => c.fn === "redeem_gift_card").length, 0);
  assert.match(emails[0].text, /Gift card MSC-AAAA-BBBB-CCCC: -\$20\.00/);
});

Deno.test("a booking created before the change (planned but not held) is still settled", async () => {
  seed("pending_payment", { gift_card_id: "card-1", gift_card_planned_cents: 2000, gift_card_applied_cents: 0, deposit_cents: 1000 });
  state.table("gift_cards").push({ id: "card-1", code: "MSC-AAAA-BBBB-CCCC", balance_cents: 5000, status: "active" });
  state.rpcHandlers.redeem_gift_card = () => ({ data: 2000, error: null });
  await deliver(event("b1"));
  assert.equal(state.rpcLog.filter((c) => c.fn === "redeem_gift_card").length, 1);
  assert.equal(state.table("bookings")[0].gift_card_applied_cents, 2000);
});
