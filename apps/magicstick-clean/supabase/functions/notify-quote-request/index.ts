// Fires on inserts into `quote_requests` (wired up as a Supabase Database
// Webhook — see SETUP.md). Emails the owner with the request details, and
// a short confirmation to the customer if they gave an email address.
//
// This function is deployed with --no-verify-jwt (Database Webhooks don't
// carry a Supabase JWT), which means without the check below it would be a
// fully open, unauthenticated endpoint on the public internet: anyone could
// POST a crafted { record: { contact: "victim@example.com", ... } } body
// directly and make this function send email to an arbitrary address using
// this project's Resend account (an open mail-relay/spam vector). The
// shared secret closes that off — only the configured Database Webhook
// (which sends it as a custom header) can trigger a real send.
//
// Required secrets (supabase secrets set ...):
//   RESEND_API_KEY        (resend.com API key)
//   OWNER_EMAIL            e.g. magicstickclean@gmail.com
//   OWNER_NOTIFY_FROM      a verified Resend sender, e.g. quotes@yourdomain.com
//   WEBHOOK_SHARED_SECRET  a long random string — set the same value as a
//                          custom "X-Webhook-Secret" header on the Database
//                          Webhook pointing at this function (see SETUP.md)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "magicstickclean@gmail.com";
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "onboarding@resend.dev";
const WEBHOOK_SHARED_SECRET = Deno.env.get("WEBHOOK_SHARED_SECRET");

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set — skipping email send.");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, text }),
  });
  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text());
  }
}

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (req) => {
  if (!WEBHOOK_SHARED_SECRET || req.headers.get("x-webhook-secret") !== WEBHOOK_SHARED_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const record = payload.record ?? payload;

    const homeParts = [record.home_type, record.bedrooms && `${record.bedrooms} bed`, record.bathrooms && `${record.bathrooms} bath`]
      .filter(Boolean);

    const photoCount = Array.isArray(record.photo_paths) ? record.photo_paths.length : 0;
    const attachments = [
      photoCount > 0 ? `${photoCount} photo${photoCount === 1 ? "" : "s"}` : null,
      record.video_path ? "1 video" : null,
    ].filter(Boolean).join(", ");

    const ownerText = [
      `New quote request from ${record.name}`,
      `Contact: ${record.contact}`,
      `Address: ${record.address || "Not specified"}`,
      `Service: ${record.service}`,
      `Frequency: ${record.frequency}`,
      `Area: ${record.zone || "Not specified"}`,
      `Home: ${homeParts.length ? homeParts.join(", ") : "Not specified"}`,
      `Preferred day: ${record.preferred_date || "Not specified"}`,
      `Pets: ${record.pets || "Not specified"}`,
      `Attachments: ${attachments || "None"}${attachments ? " — view in the owner dashboard" : ""}`,
      `First-time offer claimed: ${record.first_time_offer_claimed ? "Yes" : "No"}`,
      `Notes: ${record.message || "(none)"}`,
    ].join("\n");

    await sendEmail(OWNER_EMAIL, `New quote request: ${record.service}`, ownerText);

    if (looksLikeEmail(record.contact)) {
      await sendEmail(
        record.contact,
        "We received your Magicstick Clean quote request",
        `Hi ${record.name},\n\nThanks for reaching out to Magicstick Clean! We received your request for ${record.service} and will get back to you the same day with a quote.\n\nIn the meantime, feel free to call or text 343-843-7761.\n\n— Magicstick Clean`,
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
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
