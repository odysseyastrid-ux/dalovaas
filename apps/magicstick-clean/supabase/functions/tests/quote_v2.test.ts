// Quote form v2: separate phone / email, home size, booking requests, and the
// emails sent once a quote is saved (built by notify.ts, nothing is sent here).
import assert from "node:assert/strict";
import { validateQuote } from "../submit-quote/validate.ts";
import { clientEmail, ownerEmail } from "../submit-quote/notify.ts";

const NOW = new Date("2026-10-10T15:00:00Z");
const QID = "11111111-2222-4333-8444-555555555555";
const base = { name: "Ana", service: "Deep Cleaning", frequency: "One-time" };
const run = (patch: Record<string, unknown>) => validateQuote({ ...base, ...patch }, QID, NOW);
const err = (patch: Record<string, unknown>) => { const r = run(patch); return r.ok ? "ok" : r.error; };

Deno.test("quote v2: phone and/or email, at least one", () => {
  assert.equal(err({}), "invalid_contact");
  assert.equal(err({ phone: "343-843-7761" }), "ok");
  assert.equal(err({ email: "ana@example.com" }), "ok");
  assert.equal(err({ phone: "12" }), "invalid_phone");
  assert.equal(err({ email: "ana@" }), "invalid_email");
  assert.equal(err({ phone: "343 843 7761", email: "nope" }), "invalid_email");
  assert.equal(err({ contact: "ana@example.com" }), "ok", "older pages still send a single contact field");
  const both = run({ phone: "(343) 843-7761", email: "ana@example.com" });
  assert.ok(both.ok);
  if (both.ok) {
    assert.equal(both.value.contact, "(343) 843-7761", "contact keeps the phone when there is one");
    assert.equal(both.value.email, "ana@example.com");
  }
});

Deno.test("quote v2: size, time window, source and language", () => {
  assert.equal(err({ email: "a@b.co", home_size: "x".repeat(61) }), "invalid_details");
  assert.equal(err({ email: "a@b.co", preferred_time: "x".repeat(41) }), "invalid_details");
  const r = run({ email: "a@b.co", home_size: "1,000–1,500 sq ft", preferred_time: "Morning", source: "booking", lang: "fr" });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.source, "booking");
    assert.equal(r.value.lang, "fr");
    assert.equal(r.value.home_size, "1,000–1,500 sq ft");
  }
  const d = run({ email: "a@b.co", source: "admin", lang: "de" });
  assert.ok(d.ok && d.value.source === "quote" && d.value.lang === "en", "unknown values fall back safely");
});

Deno.test("quote v2: owner and client emails", () => {
  const r = run({
    phone: "343-843-7761", email: "ana@example.com", address: "Rockland", home_size: "Under 1,000 sq ft",
    preferred_date: "2026-10-20", preferred_time: "Morning", source: "booking", lang: "fr", message: "Code porte 1234",
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  const o = ownerEmail(r.value);
  assert.match(o.subject, /^Demande de réservation : Deep Cleaning \(Ana\)$/);
  for (const part of ["Téléphone : 343-843-7761", "Courriel : ana@example.com", "Adresse ou secteur : Rockland",
    "Superficie approximative : Under 1,000 sq ft", "Date souhaitée : 2026-10-20", "Plage horaire : Morning", "Code porte 1234"]) {
    assert.ok(o.text.includes(part), `owner email lacks "${part}"`);
  }
  const c = clientEmail(r.value);
  assert.match(c.text, /Bonjour Ana/);
  assert.match(c.text, /Rien n'est à payer en ligne/);
  const en = run({ email: "a@b.co", lang: "en" });
  assert.ok(en.ok && /Nothing to pay online/.test(clientEmail(en.value).text));
  assert.ok(en.ok && ownerEmail(en.value).text.includes("Téléphone : Non précisé"));
});
