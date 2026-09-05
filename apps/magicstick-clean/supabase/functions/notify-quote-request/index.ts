// Fires on inserts into `quote_requests` (wired up as a Supabase Database
// Webhook — see SETUP.md). Emails the owner with the request details, and
// a short confirmation to the customer if they gave an email address.
//
// Required secrets (supabase secrets set ...):
//   RESEND_API_KEY        (resend.com API key)
//   OWNER_EMAIL            e.g. magicstickclean@gmail.com
//   OWNER_NOTIFY_FROM      a verified Resend sender, e.g. quotes@yourdomain.com

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "magicstickclean@gmail.com";
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "onboarding@resend.dev";

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
  try {
    const payload = await req.json();
    const record = payload.record ?? payload;

    const homeParts = [record.home_type, record.bedrooms && `${record.bedrooms} bed`, record.bathrooms && `${record.bathrooms} bath`]
      .filter(Boolean);

    const ownerText = [
      `New quote request from ${record.name}`,
      `Contact: ${record.contact}`,
      `Service: ${record.service}`,
      `Frequency: ${record.frequency}`,
      `Area: ${record.zone || "Not specified"}`,
      `Home: ${homeParts.length ? homeParts.join(", ") : "Not specified"}`,
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
