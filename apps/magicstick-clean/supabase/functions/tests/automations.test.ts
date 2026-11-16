// Automatic order emails: each one goes out once, at the right moment.
// deno-lint-ignore-file no-explicit-any
import assert from "node:assert/strict";
import { state } from "./fake_supabase.ts";
import { emails, installFetch, loadHandler, resetAll } from "./harness.ts";
import { eastern } from "../automations/index.ts";

installFetch();
const automations = await loadHandler("../automations/index.ts");
const run = async () => {
  const res = await automations(new Request("https://functions.test/automations", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" }, body: "{}" }));
  return { status: res.status, json: await res.json() as any };
};
const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString();
const base = { status: "new", lang: "fr", name: "Ana Roy", email: "ana@example.com", service: "Standard Cleaning", quoted_amount_cents: 15000, pay_code: "K7Q2MX9P4T" };

Deno.test("receipt: sent once after a payment, never twice", async () => {
  resetAll();
  state.table("quote_requests").push({ id: "q1", ...base, quoted_at: ago(30), paid_at: ago(0.1), payment_method: "interac" });
  assert.equal((await run()).status, 200);
  const receipts = emails.filter((e) => e.to === "ana@example.com" && /Paiement reçu/.test(e.subject));
  assert.equal(receipts.length, 1);
  assert.ok(receipts[0].html?.includes("150,00"));
  await run();
  assert.equal(emails.filter((e) => /Paiement reçu/.test(e.subject)).length, 1);
});

Deno.test("job sheet: sent to the assigned employee, again only when reassigned", async () => {
  resetAll();
  state.table("employees").push({ id: "e1", name: "Fatou K", email: "fatou@example.com", active: true }, { id: "e2", name: "Marc L", email: "marc@example.com", active: true });
  const q: any = { id: "q2", ...base, address: "12 rue Laurier, Rockland", paid_at: ago(30), receipt_sent_at: ago(29), assigned_employee_id: "e1", scheduled_date: eastern().tomorrow, scheduled_window: "Morning (8am–11am)", reminder_sent_at: ago(1) };
  state.table("quote_requests").push(q);
  await run(); await run();
  const toFatou = emails.filter((e) => e.to === "fatou@example.com");
  assert.equal(toFatou.length, 1);
  assert.ok(toFatou[0].html?.includes("12 rue Laurier"));
  q.assigned_employee_id = "e2";
  await run();
  assert.equal(emails.filter((e) => e.to === "marc@example.com").length, 1);
});

Deno.test("thanks + review: not before 2 hours, then once (daytime only)", async () => {
  resetAll();
  const q: any = { id: "q3", ...base, paid_at: ago(50), receipt_sent_at: ago(49), completed_at: ago(1) };
  state.table("quote_requests").push(q);
  await run();
  assert.equal(emails.filter((e) => /Merci pour votre confiance/.test(e.subject)).length, 0);
  q.completed_at = ago(3);
  await run(); await run();
  const { hour } = eastern();
  const expected = hour >= 9 && hour < 20 ? 1 : 0;
  const sent = emails.filter((e) => /Merci pour votre confiance/.test(e.subject));
  assert.equal(sent.length, expected);
  if (expected) {
    assert.ok(sent[0].html?.includes("g.page/r/CXlL7jiMiQp2EBI/review"));
    assert.ok(q.review_requested_at);
  }
});

Deno.test("unpaid: one reminder after 3 days with the pay link; cancelled orders get nothing", async () => {
  resetAll();
  state.table("quote_requests").push({ id: "q4", ...base, quoted_at: ago(80) }, { id: "q5", ...base, email: "bob@example.com", status: "declined", quoted_at: ago(80) });
  await run(); await run();
  const { hour } = eastern();
  const mine = emails.filter((e) => e.to === "ana@example.com");
  assert.equal(mine.length, hour >= 9 && hour < 20 ? 1 : 0);
  if (mine.length) assert.ok(mine[0].html?.includes("pay.html?code=K7Q2MX9P4T"));
  assert.equal(emails.filter((e) => e.to === "bob@example.com").length, 0);
});
