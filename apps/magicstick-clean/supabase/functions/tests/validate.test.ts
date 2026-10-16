// Unit tests for the pure validators and for the shared guard module.
import assert from "node:assert/strict";
import { validateBooking, todayInServiceTz, TIME_WINDOWS } from "../create-payment-intent/validate.ts";
import { validateQuote, validateFileDeclarations } from "../submit-quote/validate.ts";
import { clientIp } from "../create-payment-intent/guard.ts";

const NOW = new Date("2026-10-10T15:00:00Z");   // 11:00 in Toronto (EDT)
const good = {
  service_id: "standard", requested_date: "2026-10-12", time_window: TIME_WINDOWS[0],
  guest_name: "Ana", guest_contact: "ana@example.com", zone: "Ottawa-Gatineau", notes: "ok",
};

Deno.test("booking: a well-formed request passes and is normalised", () => {
  const r = validateBooking({ ...good, guest_name: "  Ana\u0000  " }, NOW);
  assert.ok(r.ok);
  if (r.ok) { assert.equal(r.value.guest_name, "Ana"); assert.equal(r.value.zone, "Ottawa-Gatineau"); }
});

Deno.test("booking: 'today' is judged on Toronto's calendar, not UTC's", () => {
  // 02:00 UTC on the 11th is still the evening of the 10th in Toronto.
  const lateEvening = new Date("2026-10-11T02:00:00Z");
  assert.equal(todayInServiceTz(lateEvening), "2026-10-10");
  assert.ok(validateBooking({ ...good, requested_date: "2026-10-10" }, lateEvening).ok);
  assert.equal(validateBooking({ ...good, requested_date: "2026-10-09" }, lateEvening).ok, false);
});

Deno.test("booking: every rule the audit asked for", () => {
  const err = (patch: Record<string, unknown>) => {
    const r = validateBooking({ ...good, ...patch }, NOW);
    return r.ok ? "ok" : r.error;
  };
  assert.equal(err({ requested_date: "2020-01-01" }), "date_in_past");
  assert.equal(err({ requested_date: "2030-01-01" }), "date_too_far");
  assert.equal(err({ requested_date: "2026-02-30" }), "invalid_date");
  assert.equal(err({ requested_date: "10/12/2026" }), "invalid_date");
  assert.equal(err({ time_window: "not-a-time-slot" }), "invalid_time_window");
  assert.equal(err({ guest_name: "" }), "invalid_name");
  assert.equal(err({ guest_name: "x".repeat(121) }), "invalid_name");
  assert.equal(err({ guest_contact: "hello" }), "invalid_contact");
  assert.equal(err({ guest_contact: "x".repeat(201) }), "invalid_contact");
  assert.equal(err({ notes: "x".repeat(2001) }), "notes_too_long");
  assert.equal(err({ notes: 42 }), "invalid_notes");
  assert.equal(err({ zone: "Mars" }), "invalid_zone");
  assert.equal(err({ service_id: "../etc" }), "invalid_service");
  assert.equal(err({ idempotency_key: "short" }), "invalid_idempotency_key");
  assert.equal(err({ guest_contact: "(343) 843-7761" }), "ok");
  assert.equal(err({ guest_contact: "+1 343 843 7761" }), "ok");
  assert.equal(err({ zone: "" }), "ok");
  assert.equal(err({ notes: undefined }), "ok");
});

Deno.test("booking: the time windows are the ones booking.html offers", async () => {
  const html = await Deno.readTextFile(new URL("../../../booking.html", import.meta.url));
  for (const w of TIME_WINDOWS) assert.ok(html.includes(`value="${w}"`), `booking.html has no option "${w}"`);
  for (const z of ["Rockland-Orléans", "Ottawa-Gatineau", "Other"]) {
    assert.ok(html.includes(`value="${z}"`), `booking.html has no zone option "${z}"`);
  }
});

Deno.test("quote: field limits and shapes", () => {
  const QID = "11111111-2222-4333-8444-555555555555";
  const base = { name: "Ana", contact: "ana@example.com", service: "Standard Cleaning", frequency: "Weekly" };
  const err = (patch: Record<string, unknown>) => {
    const r = validateQuote({ ...base, ...patch }, QID, NOW);
    return r.ok ? "ok" : r.error;
  };
  assert.equal(err({}), "ok");
  assert.equal(err({ service: "Nettoyage standard" }), "ok", "a French (translated) service label is accepted");
  assert.equal(err({ frequency: "Daily" }), "invalid_frequency");
  assert.equal(err({ address: "x".repeat(301) }), "invalid_address");
  assert.equal(err({ bedrooms: "x".repeat(41) }), "invalid_details");
  assert.equal(err({ preferred_date: "2026-10-09" }), "date_in_past");
  assert.equal(err({ preferred_date: "2026-10-10" }), "ok");
  assert.equal(err({ photo_paths: Array(7).fill(`${QID}/photo-0.jpg`) }), "invalid_files");
  assert.equal(err({ photo_paths: [`${QID}/photo-0.jpg`, `${QID}/photo-0.jpg`] }), "invalid_files");
  assert.equal(err({ photo_paths: [`${QID}/photo-3.png`] }), "ok");
});

Deno.test("quote: file declarations", () => {
  assert.equal(validateFileDeclarations({ photos: [{ type: "image/jpeg", size: 1 }] }).ok, true);
  assert.equal(validateFileDeclarations({ photos: [{ type: "image/svg+xml", size: 1 }] }).ok, false);
  assert.equal(validateFileDeclarations({ photos: [{ type: "image/jpeg", size: 0 }] }).ok, false);
  assert.equal(validateFileDeclarations({ photos: [{ type: "image/jpeg", size: "9" }] }).ok, false);
});

Deno.test("guard: prefers Cloudflare's header; a forged x-forwarded-for first entry is not trusted", () => {
  const h = (headers: Record<string, string>) => clientIp(new Request("https://x.test", { headers }));
  assert.equal(h({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "6.6.6.6, 2.2.2.2" }), "1.1.1.1");
  assert.equal(h({ "x-real-ip": "3.3.3.3", "x-forwarded-for": "6.6.6.6" }), "3.3.3.3");
  assert.equal(h({ "x-forwarded-for": "6.6.6.6, 2.2.2.2" }), "2.2.2.2");
  assert.equal(h({}), "unknown");
});

Deno.test("guard.ts is byte-for-byte identical in every function that ships a copy", async () => {
  const dirs = ["ai-chat", "create-payment-intent", "gift-cards", "submit-form", "submit-quote"];
  const texts = await Promise.all(dirs.map((d) => Deno.readTextFile(new URL(`../${d}/guard.ts`, import.meta.url))));
  for (let i = 1; i < texts.length; i++) assert.equal(texts[i], texts[0], `${dirs[i]}/guard.ts differs from ${dirs[0]}/guard.ts`);
});

Deno.test("every public function ships its guard and has no leftover non-atomic limiter", async () => {
  for (const d of ["gift-cards", "submit-form"]) {
    const src = await Deno.readTextFile(new URL(`../${d}/index.ts`, import.meta.url));
    assert.ok(!src.includes("form_submission_log"), `${d} still uses the racy form_submission_log counter`);
    assert.ok(!/x-forwarded-for/i.test(src), `${d} still reads x-forwarded-for directly`);
  }
});
