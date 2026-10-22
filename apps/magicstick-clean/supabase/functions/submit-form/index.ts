// Public endpoint for the site's simple forms — newsletter signup, gift card
// requests, job applications and contest entries (concours.html). Saves the
// submission, emails the owner, and sends the visitor a confirmation (in their
// language) through the same Resend account as the other notification functions.
//
// Deployed with --no-verify-jwt (anonymous visitors submit these forms), so
// it protects itself: honeypot field, strict length checks, and a per-IP
// (hashed) rate limit so it can't be used to mass-send email.
//
// Required secrets (already set for notify-quote-request):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided on Supabase)
//   RESEND_API_KEY, OWNER_EMAIL, OWNER_NOTIFY_FROM

import { createClient } from "npm:@supabase/supabase-js@2";
import { checkLimits, readLimitedBody, type Rule, withCors, rejectForeignOrigin, logResendError } from "./guard.ts";

const MAX_BODY_BYTES = 20_000;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "magicstickclean@gmail.com";
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "onboarding@resend.dev";
const MAX_SUBMISSIONS_PER_HOUR = 8;            // per visitor, all forms together
const MAX_PER_FORM_GLOBAL_PER_HOUR = 1000;    // per form, whole site: a cost circuit-breaker, not a usage limit
const MAX_MAILS_PER_ADDRESS_PER_DAY = 2;      // to any one recipient address, whoever asks

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// "50 cleanings to win" contest. Entries close Dec 31, 2026 at 23:59:59
// Eastern (= Jan 1, 2027 04:59:59 UTC). Rules: https://magicstickclean.ca/concours.html#reglement
const CONTEST_ID = "tirage-50-2026";
const CONTEST_CLOSES_AT = Date.parse("2027-01-01T05:00:00Z");

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
  if (!res.ok) await logResendError(res);
}

// Abuse limits (guard.ts -> rate_limit_hit in Postgres, atomic and shared by
// every instance). All of them FAIL CLOSED: if a counter can't be read the
// request is refused with a temporary error instead of sending mail
// unprotected. Returns the response to send when the request must stop.
//
//  - per visitor: 8 submissions an hour across all forms;
//  - per recipient address: 2 messages a day to any one address, whatever
//    network asks — this is what stops the function being used to flood
//    someone else's inbox with the confirmation emails;
//  - per form, site-wide: a generous ceiling that only guards the Resend bill.
//    It is per form so that flooding one form can't lock visitors out of the
//    others.
async function limitGuard(req: Request, form: string, recipient: string | null): Promise<Response | null> {
  const rules: Rule[] = [
    { scope: "ip", windowSeconds: 3600, max: MAX_SUBMISSIONS_PER_HOUR },
  ];
  if (recipient) {
    rules.push({ scope: "key", id: recipient, windowSeconds: 86400, max: MAX_MAILS_PER_ADDRESS_PER_DAY });
  }
  const perVisitor = await checkLimits(supabase, req, "form", rules);
  const result = perVisitor !== "ok"
    ? perVisitor
    : await checkLimits(supabase, req, `form_${form}`, [
      { scope: "global", windowSeconds: 3600, max: MAX_PER_FORM_GLOBAL_PER_HOUR },
    ]);
  if (result === "limited") return json({ ok: false, error: "rate_limited" }, 429);
  if (result === "error") return json({ ok: false, error: "temporarily_unavailable" }, 503);
  return null;
}

// The address a submission will send mail to, when there is one: the
// newsletter's `email`, or the `contact` of the other forms if it is an email.
function mailRecipient(form: string, body: Record<string, unknown>): string | null {
  const raw = clean(form === "newsletter" ? body.email : body.contact, 254).toLowerCase();
  return isEmail(raw) ? raw : null;
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
      ? `Bonjour,\n\nMerci de t’être inscrit à l’infolettre Magicstick Clean! Tu recevras à l’occasion des conseils de ménage et nos offres saisonnières — jamais de spam.\n\nMénage résidentiel dès 30 $/h (27 $/h avec un forfait récurrent). Réserve sur https://magicstickclean.ca/booking.html ou demande un devis gratuit sur https://magicstickclean.ca/quote.html.\n\nTu ne veux plus recevoir nos courriels? Réponds simplement « désabonner » à ce message.\n\n${SIGNATURE_FR}`
      : `Hi,\n\nThanks for subscribing to the Magicstick Clean newsletter! You'll get occasional cleaning tips and seasonal offers — never spam.\n\nHome cleaning from $30/h ($27/h on a recurring plan). Book at https://magicstickclean.ca/booking.html or get a free quote at https://magicstickclean.ca/quote.html.\n\nDon't want these emails anymore? Just reply "unsubscribe" to this message.\n\n${SIGNATURE_EN}`,
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

// Normalized identity used for "one entry per person": a lower-cased email,
// or the 10 digits of a North American phone number. Null when neither.
function contactKey(contact: string): string | null {
  const lower = contact.trim().toLowerCase();
  if (isEmail(lower)) return lower;
  let digits = contact.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

async function handleContest(body: Record<string, unknown>, fr: boolean) {
  if (Date.now() >= CONTEST_CLOSES_AT) return json({ ok: false, error: "contest_closed" }, 410);
  const name = clean(body.name, 120);
  const contact = clean(body.contact, 200);
  const address = clean(body.address, 300);
  const source = clean(body.source, 200);
  if (!name || !contact || address.length < 3) return json({ ok: false, error: "missing_fields" }, 400);
  if (body.eligible !== true || body.rules !== true) return json({ ok: false, error: "not_eligible" }, 400);
  const key = contactKey(contact);
  if (!key) return json({ ok: false, error: "invalid_contact" }, 400);

  const { error } = await supabase.from("contest_entries").insert({
    contest: CONTEST_ID, name, contact, contact_key: key, address,
    lang: fr ? "fr" : "en", source: source || null,
  });
  if (error) {
    if (error.code === "23505") return json({ ok: true, already: true });
    throw new Error(error.message);
  }

  await sendEmail(
    OWNER_EMAIL,
    `Concours — nouvelle inscription : ${name}`,
    [
      `Nouvelle inscription au concours « 50 ménages à gagner »`,
      `Nom : ${name}`,
      `Contact : ${contact}`,
      `Adresse : ${address}`,
      `Langue : ${fr ? "français" : "anglais"}`,
      `Source : ${source || "(directe)"}`,
      "",
      "Toutes les inscriptions : tableau de bord > Concours.",
    ].join("\n"),
  );
  if (isEmail(contact)) {
    await sendEmail(
      contact,
      fr ? "Ton inscription au concours Magicstick Clean est confirmée" : "Your Magicstick Clean contest entry is confirmed",
      fr
        ? `Bonjour ${name},\n\nC’est noté : tu participes au concours « 50 ménages à gagner » de Magicstick Clean.\n\nPrix : un ménage standard de 3 h (valeur de 90 $), 50 gagnants.\nInscriptions jusqu’au 31 décembre 2026, tirage le 5 janvier 2027. Les gagnants seront contactés par téléphone ou courriel, et devront répondre à une question d’habileté mathématique.\n\nRèglement complet : https://magicstickclean.ca/concours.html#reglement\n\nBonne chance !\n\n${SIGNATURE_FR}`
        : `Hi ${name},\n\nYou're in: you are entered in Magicstick Clean's "50 cleanings to win" contest.\n\nPrize: one 3-hour standard cleaning (value $90), 50 winners.\nEntries close December 31, 2026; the draw is on January 5, 2027. Winners will be contacted by phone or email and must answer a skill-testing question.\n\nFull rules: https://magicstickclean.ca/concours.html#reglement\n\nGood luck!\n\n${SIGNATURE_EN}`,
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

Deno.serve(async (req) => withCors(req, rejectForeignOrigin(req) ?? await handle(req)));

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const text = await readLimitedBody(req, MAX_BODY_BYTES);
    if (text === null) return json({ ok: false, error: "payload_too_large" }, 413);
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ ok: false, error: "invalid_body" }, 400);
    const body = parsed as Record<string, unknown>;
    const form = clean(body.form, 40);
    const fr = body.lang === "fr";

    // Honeypot filled in: a bot. Report success so it learns nothing.
    if (clean(body.company, 200)) return json({ ok: true });

    if (!["newsletter", "gift_card", "job_application", "contest"].includes(form)) {
      return json({ ok: false, error: "unknown_form" }, 400);
    }

    const blocked = await limitGuard(req, form, mailRecipient(form, body));
    if (blocked) return blocked;

    if (form === "newsletter") return await handleNewsletter(body, fr);
    if (form === "gift_card") return await handleGiftCard(body, fr);
    if (form === "contest") return await handleContest(body, fr);
    return await handleJobApplication(body, fr);
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "server_error" }, 500);
  }
}
