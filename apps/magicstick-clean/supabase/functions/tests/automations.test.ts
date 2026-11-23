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

// ---------- Partner agencies: deposit before the job, invoice from actual hours ----------
const partner = { id: "p1", name: "Care n Tidy", payment_terms_days: 7 };
const pBase = { status: "booked", lang: "en", name: "Alex (Care n Tidy)", email: "alex@agency.example", service: "Standard Cleaning", partner_id: "p1", hourly_rate_cents: 3000, estimated_hours: 6, quoted_amount_cents: 18000, deposit_cents: 9000, quoted_at: ago(1), pay_code: "P7Q2MX9P4T", address: "1 Test Way, Ottawa", scheduled_window: "Morning (8am–11am)" };
const daytime = () => { const { hour } = eastern(); return hour >= 9 && hour < 20; };
const inDays = (n: number) => { const d = new Date(`${eastern().today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

Deno.test("partner: confirmation asks for the deposit before the job, once; again if the date changes", async () => {
  resetAll();
  state.table("partners").push(partner);
  const q: any = { id: "pq1", ...pBase, scheduled_date: inDays(5) };
  state.table("quote_requests").push(q);
  await run(); await run();
  const conf = emails.filter((e) => /Booking confirmed/.test(e.subject));
  assert.equal(conf.length, 1);
  assert.ok(conf[0].html?.includes("Deposit due before the cleaning: $90.00"));
  assert.ok(conf[0].html?.includes("P7Q2-MX9P-4T"));
  assert.equal(emails.filter((e) => /price is waiting|prix vous attend/.test(e.subject)).length, 0, "partners never get the unpaid-price reminder");
  q.scheduled_date = inDays(6);
  await run();
  assert.equal(emails.filter((e) => /Booking confirmed/.test(e.subject)).length, 2);
});

Deno.test("partner: deposit reminder 2 days before, owner alert the day before, deposit receipt once paid", async () => {
  resetAll();
  state.table("partners").push(partner);
  const q: any = { id: "pq2", ...pBase, quoted_at: ago(48), scheduled_date: eastern().tomorrow, confirmation_date: eastern().tomorrow, reminder_sent_at: ago(1) };
  state.table("quote_requests").push(q);
  await run(); await run();
  const { hour } = eastern();
  assert.equal(emails.filter((e) => /deposit due before/i.test(e.subject)).length, daytime() ? 1 : 0);
  assert.equal(emails.filter((e) => /Acompte NON reçu/.test(e.subject)).length, hour >= 9 ? 1 : 0);
  q.deposit_paid_at = ago(0.1);
  await run(); await run();
  const rec = emails.filter((e) => /Deposit received/.test(e.subject));
  assert.equal(rec.length, 1);
  assert.ok(rec[0].html?.includes("$90.00"));
});

Deno.test("partner: invoice from actual hours minus the deposit, then one balance reminder after the terms", async () => {
  resetAll();
  state.table("partners").push(partner);
  const q: any = { id: "pq3", ...pBase, scheduled_date: inDays(-1), confirmation_date: inDays(-1), reminder_sent_at: ago(30), deposit_paid_at: ago(40), deposit_receipt_at: ago(40),
    completed_at: ago(3), actual_hours: 5, final_amount_cents: 15000 };
  state.table("quote_requests").push(q);
  await run(); await run();
  const inv = emails.filter((e) => /Invoice/.test(e.subject));
  assert.equal(inv.length, daytime() ? 1 : 0);
  if (inv.length) {
    assert.ok(inv[0].html?.includes("$150.00"));
    assert.ok(inv[0].html?.includes("Balance due: $60.00"));
  }
  assert.equal(emails.filter((e) => /Thank you for trusting us/.test(e.subject)).length, 0, "no review request to an agency");
  q.invoice_sent_at = ago(8 * 24); q.completed_at = ago(8 * 24);
  await run(); await run();
  assert.equal(emails.filter((e) => /Reminder: balance/.test(e.subject)).length, daytime() ? 1 : 0);
});

// ---------- Prospecting: one daily list for the owner, nothing to prospects ----------
import { pickProspects } from "../automations/index.ts";

Deno.test("pickProspects: due follow-ups first, then new ones by category, 10 max, skips done ones", () => {
  const today = "2026-11-24";
  const rows = [
    { id: "a", name: "Builder", category: "contractor", status: "todo", created_at: "1" },
    { id: "b", name: "Agency", category: "agency", status: "todo", created_at: "2" },
    { id: "c", name: "Follow", category: "property", status: "contacted", next_action_on: "2026-11-23" },
    { id: "d", name: "Later", category: "property", status: "contacted", next_action_on: "2026-11-30" },
    { id: "e", name: "Snoozed", category: "airbnb", status: "todo", next_action_on: "2026-12-01" },
    ...Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, name: `P${i}`, category: "realtor", status: "todo", created_at: `3${i}` })),
  ];
  const out = pickProspects(rows, today);
  assert.equal(out.length, 10);
  assert.deepEqual(out.slice(0, 2).map((p) => p.id), ["c", "b"]);
  assert.ok(!out.some((p) => ["d", "e"].includes(p.id)));
});

Deno.test("prospect digest: sent to the owner once a day during the day, never to prospects", async () => {
  resetAll();
  state.table("prospects").push(
    { id: "pr1", name: "LR Gestion", category: "property", status: "todo", phone: "819-414-2002", email: "location@lrgestion.example", created_at: "1" },
    { id: "pr2", name: "Gone", category: "agency", status: "not_interested", created_at: "2" },
  );
  await run(); await run();
  const { hour } = eastern();
  const digests = emails.filter((e) => /À contacter aujourd’hui/.test(e.subject));
  assert.equal(digests.length, hour >= 8 && hour < 20 ? 1 : 0);
  if (digests.length) {
    assert.ok(digests[0].html?.includes("LR Gestion"));
    assert.ok(!digests[0].html?.includes("Gone"));
  }
  assert.equal(emails.filter((e) => e.to === "location@lrgestion.example").length, 0);
});
