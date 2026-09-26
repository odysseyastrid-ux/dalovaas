// Public endpoint for the site's simple forms — newsletter signup, gift card
// requests, and job applications. Saves the submission, emails the owner,
// and sends the visitor a confirmation (in their language) through the same
// Resend account as the other notification functions.
//
// Deployed with --no-verify-jwt (anonymous visitors submit these forms), so
// it protects itself: honeypot field, strict length checks, and a per-IP
// (hashed) rate limit so it can't be used to mass-send email.
//
// Required secrets (already set for notify-quote-request):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided on Supabase)
//   RESEND_API_KEY, OWNER_EMAIL, OWNER_NOTIFY_FROM

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "magicstickclean@gmail.com";
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "onboarding@resend.dev";
const MAX_SUBMISSIONS_PER_HOUR = 8;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIGNATURE_EN = "— The Magicstick Clean team\n343-843-7761 · magicstickclean@gmail.com\nhttps://magicstickclean.ca";
const SIGNATURE_FR = "— L’équipe Magicstick Clean\n343-843-7761 · magicstickclean@gmail.com\nhttps://magicstickclean.ca";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set — skipping email send.");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, reply_to: OWNER_EMAIL, subject, text }),
  });
  if (!res.ok) console.error("Resend error:", res.status, await res.text());
}

async function hashIp(req: Request): Promise<string> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const data = new TextEncoder().encode(`magicstick:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isRateLimited(ipHash: string, form: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("form_submission_log")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_SUBMISSIONS_PER_HOUR) return true;
  await supabase.from("form_submission_log").insert({ ip_hash: ipHash, form });
  return false;
}

async function handleNewsletter(body: Record<string, unknown>, fr: boolean) {
  const email = clean(body.email, 254).toLowerCase();
  if (!isEmail(email)) return json({ ok: false, error: "invalid_email" }, 400);

  const { error } = await supabase.from("newsletter_subscribers").insert({
    email,
    lang: fr ? "fr" : "en",
    source_page: clean(body.page, 200) || null,
  });
  if (error) {
    if (error.code === "23505") return json({ ok: true, already: true });
    throw new Error(error.message);
  }

  await sendEmail(OWNER_EMAIL, `New newsletter subscriber: ${email}`, `New newsletter subscriber: ${email}\nLanguage: ${fr ? "French" : "English"}\nPage: ${clean(body.page, 200) || "unknown"}`);
  await sendEmail(
    email,
    fr ? "Bienvenue dans l’infolettre Magicstick Clean" : "Welcome to the Magicstick Clean newsletter",
    fr
      ? `Bonjour,\n\nMerci de t’être inscrit à l’infolettre Magicstick Clean! Tu recevras à l’occasion des conseils de ménage et nos offres saisonnières — jamais de spam.\n\nNouveau client? Ton premier ménage est à 37 $/h (15% de rabais). Réserve sur https://magicstickclean.ca/booking.html ou demande un devis gratuit sur https://magicstickclean.ca/quote.html.\n\nTu ne veux plus recevoir nos courriels? Réponds simplement « désabonner » à ce message.\n\n${SIGNATURE_FR}`
      : `Hi,\n\nThanks for subscribing to the Magicstick Clean newsletter! You'll get occasional cleaning tips and seasonal offers — never spam.\n\nNew client? Your first clean is $37/h (15% off). Book at https://magicstickclean.ca/booking.html or get a free quote at https://magicstickclean.ca/quote.html.\n\nDon't want these emails anymore? Just reply "unsubscribe" to this message.\n\n${SIGNATURE_EN}`,
  );
  return json({ ok: true });
}

async function handleGiftCard(body: Record<string, unknown>, fr: boolean) {
  const name = clean(body.name, 120);
  const contact = clean(body.contact, 200);
  const amount = clean(body.amount, 40);
  const recipient = clean(body.recipient, 200);
  const message = clean(body.message, 2000);
  if (!name || !contact || !amount) return json({ ok: false, error: "missing_fields" }, 400);

  const { error } = await supabase.from("gift_card_requests").insert({
    name, contact, amount, recipient: recipient || null, message: message || null,
  });
  if (error) throw new Error(error.message);

  await sendEmail(
    OWNER_EMAIL,
    `Gift card request — ${amount} — ${name}`,
    [
      `New gift card request from ${name}`,
      `Contact: ${contact}`,
      `Amount: ${amount}`,
      `Recipient: ${recipient || "(not specified)"}`,
      `Message: ${message || "(none)"}`,
      "",
      "Reach out within a day to arrange payment.",
    ].join("\n"),
  );
  if (isEmail(contact)) {
    await sendEmail(
      contact,
      fr ? "Nous avons reçu ta demande de carte-cadeau" : "We received your gift card request",
      fr
        ? `Bonjour ${name},\n\nMerci! Nous avons bien reçu ta demande de carte-cadeau Magicstick Clean de ${amount}${recipient ? ` pour ${recipient}` : ""}. Nous te contactons en moins d’une journée pour organiser le paiement et les détails.\n\n${SIGNATURE_FR}`
        : `Hi ${name},\n\nThank you! We received your request for a ${amount} Magicstick Clean gift card${recipient ? ` for ${recipient}` : ""}. We'll reach out within a day to arrange payment and details.\n\n${SIGNATURE_EN}`,
    );
  }
  return json({ ok: true });
}

async function handleJobApplication(body: Record<string, unknown>, fr: boolean) {
  const name = clean(body.name, 120);
  const contact = clean(body.contact, 200);
  const availability = clean(body.availability, 80);
  const experience = clean(body.experience, 80);
  const message = clean(body.message, 4000);
  if (!name || !contact) return json({ ok: false, error: "missing_fields" }, 400);

  const { error } = await supabase.from("job_applications").insert({
    name, contact,
    availability: availability || null,
    experience: experience || null,
    message: message || null,
  });
  if (error) throw new Error(error.message);

  await sendEmail(
    OWNER_EMAIL,
    `Job application — ${name} (${availability || "availability not given"})`,
    [
      `New job application from ${name}`,
      `Contact: ${contact}`,
      `Availability: ${availability || "(not given)"}`,
      `Experience: ${experience || "(not given)"}`,
      `Message: ${message || "(none)"}`,
    ].join("\n"),
  );
  if (isEmail(contact)) {
    await sendEmail(
      contact,
      fr ? "Nous avons reçu ta candidature" : "We received your application",
      fr
        ? `Bonjour ${name},\n\nMerci de ton intérêt pour Magicstick Clean! Nous avons bien reçu ta candidature. Nous l’examinons et te revenons rapidement.\n\n${SIGNATURE_FR}`
        : `Hi ${name},\n\nThanks for your interest in Magicstick Clean! We received your application and will get back to you soon.\n\n${SIGNATURE_EN}`,
    );
  }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const body = await req.json() as Record<string, unknown>;
    const form = clean(body.form, 40);
    const fr = body.lang === "fr";

    // Honeypot filled in: a bot. Report success so it learns nothing.
    if (clean(body.company, 200)) return json({ ok: true });

    if (!["newsletter", "gift_card", "job_application"].includes(form)) {
      return json({ ok: false, error: "unknown_form" }, 400);
    }

    if (await isRateLimited(await hashIp(req), form)) {
      return json({ ok: false, error: "rate_limited" }, 429);
    }

    if (form === "newsletter") return await handleNewsletter(body, fr);
    if (form === "gift_card") return await handleGiftCard(body, fr);
    return await handleJobApplication(body, fr);
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
