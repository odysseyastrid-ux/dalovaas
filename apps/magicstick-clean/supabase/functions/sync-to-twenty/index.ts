// Fires on inserts into `quote_requests` and `bookings` (wired up as two
// Supabase Database Webhooks pointing at this same function — see
// twenty-crm/README.md). Upserts the customer as a Person in a self-hosted
// Twenty CRM instance and attaches a Note with the request/booking details.
//
// Required secrets (supabase secrets set ...):
//   TWENTY_API_URL   e.g. https://crm.yourdomain.com  (no trailing slash)
//   TWENTY_API_KEY   API key from Twenty: Settings → API & Webhooks → API

const TWENTY_API_URL = (Deno.env.get("TWENTY_API_URL") ?? "").replace(/\/$/, "");
const TWENTY_API_KEY = Deno.env.get("TWENTY_API_KEY");

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? fullName,
    lastName: parts.slice(1).join(" ") || "-",
  };
}

async function twentyFetch(path: string, init: RequestInit) {
  const res = await fetch(`${TWENTY_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TWENTY_API_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Twenty API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Finds an existing Person by email or phone, or creates one. Returns the person id.
async function upsertPerson(fullName: string, contact: string): Promise<string> {
  const isEmail = looksLikeEmail(contact);
  const filter = isEmail
    ? `emails.primaryEmail[eq]:${contact}`
    : `phones.primaryPhoneNumber[eq]:${contact.replace(/\D/g, "")}`;

  const existing = await twentyFetch(`/rest/people?filter=${encodeURIComponent(filter)}`, { method: "GET" });
  const match = existing?.data?.people?.[0];
  if (match) return match.id;

  const { firstName, lastName } = splitName(fullName);
  const body: Record<string, unknown> = { name: { firstName, lastName } };
  if (isEmail) {
    body.emails = { primaryEmail: contact };
  } else {
    body.phones = { primaryPhoneNumber: contact.replace(/\D/g, ""), primaryPhoneCallingCode: "+1", primaryPhoneCountryCode: "CA" };
  }

  const created = await twentyFetch("/rest/people", { method: "POST", body: JSON.stringify(body) });
  return created.data.createPerson.id;
}

async function attachNote(personId: string, title: string, markdown: string) {
  const note = await twentyFetch("/rest/notes", {
    method: "POST",
    body: JSON.stringify({ title, bodyV2: { markdown } }),
  });
  const noteId = note.data.createNote.id;
  await twentyFetch("/rest/noteTargets", {
    method: "POST",
    body: JSON.stringify({ noteId, targetPersonId: personId }),
  });
}

function buildQuoteRequestNote(record: Record<string, any>) {
  const lines = [
    `Service: ${record.service}`,
    `Frequency: ${record.frequency}`,
    `Area: ${record.zone || "Not specified"}`,
    `Preferred day: ${record.preferred_date || "Not specified"}`,
    `First-time offer claimed: ${record.first_time_offer_claimed ? "Yes" : "No"}`,
    `Notes: ${record.message || "(none)"}`,
  ];
  return { title: `Quote request: ${record.service}`, markdown: lines.join("\n") };
}

function buildBookingNote(record: Record<string, any>) {
  const amount = (record.amount_cents / 100).toFixed(2);
  const deposit = (record.deposit_cents / 100).toFixed(2);
  const lines = [
    `Service: ${record.service_id}`,
    `Date: ${record.requested_date} (${record.time_window})`,
    `Area: ${record.zone || "Not specified"}`,
    `Total: $${amount} — Deposit: $${deposit}`,
    `Status: ${record.status}`,
    `Notes: ${record.notes || "(none)"}`,
  ];
  return { title: `Booking: ${record.service_id}`, markdown: lines.join("\n") };
}

Deno.serve(async (req) => {
  if (!TWENTY_API_URL || !TWENTY_API_KEY) {
    console.error("TWENTY_API_URL / TWENTY_API_KEY are not set — skipping sync.");
    return new Response(JSON.stringify({ ok: false, error: "Twenty CRM not configured" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const table: string = payload.table;
    const record = payload.record ?? payload;

    let name: string;
    let contact: string;
    let note: { title: string; markdown: string };

    if (table === "quote_requests") {
      name = record.name;
      contact = record.contact;
      note = buildQuoteRequestNote(record);
    } else if (table === "bookings") {
      name = record.guest_name;
      contact = record.guest_contact;
      note = buildBookingNote(record);
    } else {
      return new Response(JSON.stringify({ ok: false, error: `Unhandled table: ${table}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const personId = await upsertPerson(name, contact);
    await attachNote(personId, note.title, note.markdown);

    return new Response(JSON.stringify({ ok: true, personId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
