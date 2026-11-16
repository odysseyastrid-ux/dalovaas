// Automatic emails for orders (owner's plan, Nov 16, 2026). Runs every 15 min
// (pg_cron, migration 0030) and right after dashboard actions. Each email is
// claimed with a conditional update on its *_sent_at stamp before it is sent,
// so a run can be repeated (or overlap another) without sending anything
// twice. Public (verify_jwt off): it only acts on what the database says is
// due, and is rate limited.
//
//   receipt   payment recorded (card via stripe-webhook, or Interac marked
//             paid in the dashboard)            -> client receipt
//   job sheet order assigned to an employee      -> employee job sheet
//   reminder  confirmed date is tomorrow (from 9 a.m. Eastern)
//                                                -> client + employee
//   thanks    marked done 2+ hours ago (9 a.m.–8 p.m.)
//                                                -> client thank-you + Google review link
//   unpaid    price sent 3+ days ago, not paid (9 a.m.–8 p.m.), once
//                                                -> client reminder with the pay link
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), RESEND_API_KEY,
//          OWNER_NOTIFY_FROM, OWNER_EMAIL.

import { createClient } from "npm:@supabase/supabase-js@2";
import { checkLimits, withCors, rejectForeignOrigin, logResendError } from "./guard.ts";

// deno-lint-ignore no-explicit-any
const supabase: any = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "noreply@magicstickclean.ca";
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "magicstickclean@gmail.com";
const SITE = "https://magicstickclean.ca";
const REVIEW_LINK = "https://g.page/r/CXlL7jiMiQp2EBI/review";
const TZ = "America/Toronto";
const WINDOWS: Record<string, [string, string]> = {
  "Morning (8am–11am)": ["Morning (8–11 am)", "Matin (8 h–11 h)"],
  "Midday (11am–2pm)": ["Midday (11 am–2 pm)", "Midi (11 h–14 h)"],
  "Afternoon (2pm–5pm)": ["Afternoon (2–5 pm)", "Après-midi (14 h–17 h)"],
};

type Q = Record<string, any>;
const isEmail = (v: unknown) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) && v.length <= 254;
const clientEmail = (q: Q) => [q.email, q.contact].map((v) => String(v ?? "").trim()).find(isEmail) ?? null;
const first = (name: unknown) => String(name ?? "").trim().split(/\s+/)[0] || "";
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const cad = (cents: number, fr: boolean) => new Intl.NumberFormat(fr ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
const prettyCode = (c: string) => c.replace(/^(.{4})(.{4})(.{2})$/, "$1-$2-$3");
const windowText = (w: unknown, fr: boolean) => (WINDOWS[String(w)] ?? [String(w ?? ""), String(w ?? "")])[fr ? 1 : 0];
const dayText = (iso: string, fr: boolean) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(fr ? "fr-CA" : "en-CA", { weekday: "long", day: "numeric", month: "long" });

export function eastern(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map((p) => [p.type, p.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const t = new Date(`${today}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return { today, tomorrow: t.toISOString().slice(0, 10), hour: Number(parts.hour) };
}

// One branded layout for every automatic email; the text part says the same.
export function layout(fr: boolean, title: string, paragraphs: string[], button?: { href: string; label: string }) {
  return `<!doctype html><html lang="${fr ? "fr" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f3f1fb"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f1fb"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:22px;overflow:hidden">
<tr><td style="height:6px;background:#6b3fe6;background-image:linear-gradient(90deg,#2e8be6,#8b4de6)"></td></tr>
<tr><td style="padding:26px 30px 6px;font:700 17px/1 Georgia,serif;color:#111827"><img src="${SITE}/assets/images/logo-email.png" width="26" height="26" alt="" style="vertical-align:middle;margin-right:8px">Magicstick Clean</td></tr>
<tr><td style="padding:14px 30px 6px;font:700 24px/1.25 Georgia,serif;color:#111827">${esc(title)}</td></tr>
${paragraphs.map((p) => `<tr><td style="padding:8px 30px;font:16px/1.6 Arial,Helvetica,sans-serif;color:#374151">${p}</td></tr>`).join("")}
${button ? `<tr><td style="padding:18px 30px 6px"><a href="${button.href}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;font:700 15px/1 Arial,sans-serif;padding:15px 24px;border-radius:999px">${esc(button.label)} &rarr;</a></td></tr>` : ""}
<tr><td style="padding:22px 30px;font:13px/1.6 Arial,sans-serif;color:#6b7280">${fr ? "Une question ? Répondez à ce courriel ou appelez/textez le" : "Questions? Reply to this email or call/text"} <a href="tel:+13438437761" style="color:#374151">343-843-7761</a>.<br>Magicstick Clean · Clarence-Rockland · Ottawa · Gatineau</td></tr>
</table></td></tr></table></body></html>`;
}
const toText = (title: string, paragraphs: string[], button?: { href: string; label: string }) =>
  [title, "", ...paragraphs.map((p) => p.replace(/<br>/g, "\n").replace(/<[^>]+>/g, "")), button ? `\n${button.label}: ${button.href}` : "", "", "— Magicstick Clean · 343-843-7761"].join("\n");

async function send(to: string, subject: string, title: string, paragraphs: string[], fr: boolean, button?: { href: string; label: string }): Promise<boolean> {
  if (!RESEND_API_KEY) { console.error("RESEND_API_KEY missing"); return false; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to, reply_to: OWNER_EMAIL, subject, html: layout(fr, title, paragraphs, button), text: toText(title, paragraphs, button) }),
    });
    if (!res.ok) { await logResendError(res); return false; }
    return true;
  } catch (err) {
    console.error("Resend request failed:", (err as Error).name);
    return false;
  }
}

// Claims one stamp (null -> now) on one order; only the winner sends.
async function claim(id: string, column: string, extra: Record<string, unknown> = {}): Promise<boolean> {
  const { data, error } = await supabase.from("quote_requests")
    .update({ [column]: new Date().toISOString(), ...extra }).eq("id", id).is(column, null).select("id");
  if (error) { console.error("claim failed", column, error.message); return false; }
  return Array.isArray(data) && data.length === 1;
}
const release = (id: string, column: string) => supabase.from("quote_requests").update({ [column]: null }).eq("id", id);

const svc = (q: Q, fr: boolean) => {
  const s = String(q.service ?? "");
  if (/^standard cleaning$/i.test(s)) return fr ? "Ménage standard" : "Standard cleaning";
  return s || (fr ? "votre ménage" : "your cleaning");
};

async function receipts(rows: Q[]) {
  let n = 0;
  for (const q of rows) {
    const to = clientEmail(q);
    if (!to) { await claim(q.id, "receipt_sent_at"); continue; }
    if (!(await claim(q.id, "receipt_sent_at"))) continue;
    const fr = q.lang !== "en";
    const method = q.payment_method === "card" ? (fr ? "par carte" : "by card") : q.payment_method === "interac" ? (fr ? "par virement Interac" : "by Interac e-Transfer") : "";
    const ok = await send(to, fr ? "Paiement reçu, merci ! — Magicstick Clean" : "Payment received, thank you! — Magicstick Clean",
      fr ? `Merci ${first(q.name)}, c’est payé` : `Thank you ${first(q.name)}, you’re all set`,
      fr
        ? [`Nous avons bien reçu votre paiement de <strong>${esc(cad(q.quoted_amount_cents, true))}</strong> ${esc(method)} pour : ${esc(svc(q, true))}.`, `Numéro de commande : <strong>${esc(prettyCode(q.pay_code ?? ""))}</strong>`, q.scheduled_date ? `Votre ménage est prévu le <strong>${esc(dayText(q.scheduled_date, true))}</strong> (${esc(windowText(q.scheduled_window, true))}).` : "Nous vous confirmons la date et l’heure de la visite très bientôt."]
        : [`We received your payment of <strong>${esc(cad(q.quoted_amount_cents, false))}</strong> ${esc(method)} for: ${esc(svc(q, false))}.`, `Order number: <strong>${esc(prettyCode(q.pay_code ?? ""))}</strong>`, q.scheduled_date ? `Your cleaning is scheduled for <strong>${esc(dayText(q.scheduled_date, false))}</strong> (${esc(windowText(q.scheduled_window, false))}).` : "We’ll confirm the date and time of your visit very soon."],
      fr);
    if (ok) n++; else await release(q.id, "receipt_sent_at");
  }
  return n;
}

async function jobSheets(rows: Q[], staff: Map<string, Q>) {
  let n = 0;
  for (const q of rows) {
    const e = staff.get(q.assigned_employee_id);
    if (!e || !isEmail(e.email)) continue;
    const { data } = await supabase.from("quote_requests")
      .update({ job_sheet_employee_id: e.id, job_sheet_sent_at: new Date().toISOString() })
      .eq("id", q.id).or(`job_sheet_employee_id.is.null,job_sheet_employee_id.neq.${e.id}`).select("id");
    if (!data || data.length !== 1) continue;
    const when = q.scheduled_date ? `${dayText(q.scheduled_date, true)} · ${windowText(q.scheduled_window, true)}` : "date à confirmer";
    const home = [q.home_type, q.home_size, q.bedrooms ? `${q.bedrooms} ch.` : "", q.bathrooms ? `${q.bathrooms} sdb` : ""].filter(Boolean).join(" · ");
    const ok = await send(e.email, `Nouveau ménage : ${when}`, `Bonjour ${first(e.name)}, voici ton prochain ménage`, [
      `<strong>Quand :</strong> ${esc(when)}`,
      `<strong>Client :</strong> ${esc(q.name)}${q.phone ? ` · <a href="tel:${esc(String(q.phone).replace(/[^0-9+]/g, ""))}">${esc(q.phone)}</a>` : ""}`,
      `<strong>Adresse :</strong> ${esc(q.address || q.zone || "à confirmer")}`,
      `<strong>Service :</strong> ${esc(svc(q, true))}${q.frequency ? ` (${esc(q.frequency)})` : ""}`,
      home ? `<strong>Logement :</strong> ${esc(home)}` : "",
      q.pets ? `<strong>Animaux :</strong> ${esc(q.pets)}` : "",
      q.message ? `<strong>Consignes du client :</strong><br>${esc(q.message)}` : "",
      "Une question ou un empêchement ? Appelle ou texte tout de suite le 343-843-7761.",
    ].filter(Boolean), true);
    if (ok) n++;
    else await supabase.from("quote_requests").update({ job_sheet_employee_id: null, job_sheet_sent_at: null }).eq("id", q.id);
  }
  return n;
}

async function reminders(rows: Q[], staff: Map<string, Q>) {
  let n = 0;
  for (const q of rows) {
    if (!(await claim(q.id, "reminder_sent_at"))) continue;
    const fr = q.lang !== "en";
    const to = clientEmail(q);
    if (to) {
      await send(to, fr ? "Rappel : votre ménage est demain" : "Reminder: your cleaning is tomorrow",
        fr ? "À demain !" : "See you tomorrow!",
        fr
          ? [`Bonjour ${esc(first(q.name))}, petit rappel : votre ${esc(svc(q, true).toLowerCase())} est prévu <strong>demain, ${esc(dayText(q.scheduled_date, true))}</strong>, ${esc(windowText(q.scheduled_window, true))}.`, "Merci de prévoir l’accès au logement (clé, code, stationnement). Besoin de changer l’heure ? Répondez simplement à ce courriel."]
          : [`Hi ${esc(first(q.name))}, a quick reminder: your ${esc(svc(q, false).toLowerCase())} is <strong>tomorrow, ${esc(dayText(q.scheduled_date, false))}</strong>, ${esc(windowText(q.scheduled_window, false))}.`, "Please plan access to the home (key, code, parking). Need to change the time? Just reply to this email."],
        fr);
    }
    const e = staff.get(q.assigned_employee_id);
    if (e && isEmail(e.email)) {
      await send(e.email, `Rappel : ménage demain chez ${first(q.name)}`, "Rappel pour demain", [
        `${esc(dayText(q.scheduled_date, true))} · ${esc(windowText(q.scheduled_window, true))}`,
        `${esc(q.name)} — ${esc(q.address || q.zone || "")}${q.phone ? ` · ${esc(q.phone)}` : ""}`,
        q.message ? `Consignes : ${esc(q.message)}` : "",
      ].filter(Boolean), true);
    }
    n++;
  }
  return n;
}

async function thanks(rows: Q[]) {
  let n = 0;
  for (const q of rows) {
    const to = clientEmail(q);
    if (!to) { await claim(q.id, "thanks_sent_at"); continue; }
    if (!(await claim(q.id, "thanks_sent_at", q.review_requested_at ? {} : { review_requested_at: new Date().toISOString() }))) continue;
    const fr = q.lang !== "en";
    const ok = await send(to, fr ? "Merci pour votre confiance ! — Magicstick Clean" : "Thank you for trusting us! — Magicstick Clean",
      fr ? `Merci ${first(q.name)} !` : `Thank you ${first(q.name)}!`,
      fr
        ? ["C’était un plaisir de prendre soin de votre maison. Si quelque chose ne vous satisfait pas, dites-le-nous : nous revenons arranger ça.", "Si vous êtes satisfait·e, un avis sur Google nous aide énormément. Ça prend 30 secondes."]
        : ["It was a pleasure to take care of your home. If anything isn’t right, tell us and we’ll come back to fix it.", "If you’re happy with the result, a Google review helps us a lot. It takes 30 seconds."],
      fr, { href: REVIEW_LINK, label: fr ? "Laisser un avis Google" : "Leave a Google review" });
    if (ok) n++; else await release(q.id, "thanks_sent_at");
  }
  return n;
}

async function unpaid(rows: Q[]) {
  let n = 0;
  for (const q of rows) {
    const to = clientEmail(q);
    if (!to || !q.pay_code) { await claim(q.id, "unpaid_reminder_at"); continue; }
    if (!(await claim(q.id, "unpaid_reminder_at"))) continue;
    const fr = q.lang !== "en";
    const link = `${SITE}/pay.html?code=${q.pay_code}&lang=${fr ? "fr" : "en"}`;
    const ok = await send(to, fr ? "Votre prix vous attend — Magicstick Clean" : "Your price is waiting — Magicstick Clean",
      fr ? "Toujours partant·e ?" : "Still interested?",
      fr
        ? [`Bonjour ${esc(first(q.name))}, votre prix pour ${esc(svc(q, true).toLowerCase())} est toujours réservé : <strong>${esc(cad(q.quoted_amount_cents, true))}</strong>.`, `Vous pouvez payer en ligne (carte ou virement Interac) avec votre numéro de commande <strong>${esc(prettyCode(q.pay_code))}</strong>, ou le jour du ménage. Une question sur le prix ? Répondez à ce courriel.`]
        : [`Hi ${esc(first(q.name))}, your price for ${esc(svc(q, false).toLowerCase())} is still held: <strong>${esc(cad(q.quoted_amount_cents, false))}</strong>.`, `You can pay online (card or Interac e-Transfer) with your order number <strong>${esc(prettyCode(q.pay_code))}</strong>, or on the day. Questions about the price? Reply to this email.`],
      fr, { href: link, label: fr ? "Voir et payer ma commande" : "View and pay my order" });
    if (ok) n++; else await release(q.id, "unpaid_reminder_at");
  }
  return n;
}

export async function runAutomations(now = new Date()) {
  const { today, tomorrow, hour } = eastern(now);
  const daytime = hour >= 9 && hour < 20;
  const iso = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();
  const cols = "id, name, email, contact, phone, address, zone, service, frequency, home_type, home_size, bedrooms, bathrooms, pets, message, lang, status, quoted_amount_cents, quoted_at, pay_code, paid_at, payment_method, scheduled_date, scheduled_window, completed_at, review_requested_at, assigned_employee_id, job_sheet_employee_id";
  const { data: staffRows } = await supabase.from("employees").select("id, name, email, active");
  const staff = new Map<string, Q>(((staffRows ?? []) as Q[]).filter((e) => e.active !== false).map((e) => [e.id, e] as [string, Q]));

  const q = () => supabase.from("quote_requests").select(cols).neq("status", "declined").limit(50);
  const [r1, r2, r3, r4, r5] = (await Promise.all([
    q().not("paid_at", "is", null).is("receipt_sent_at", null).gte("paid_at", iso(14 * 864e5)),
    q().not("assigned_employee_id", "is", null).is("completed_at", null).or(`scheduled_date.is.null,scheduled_date.gte.${today}`),
    hour >= 9 ? q().eq("scheduled_date", tomorrow).is("reminder_sent_at", null).is("completed_at", null) : Promise.resolve({ data: [] }),
    daytime ? q().not("completed_at", "is", null).is("thanks_sent_at", null).lte("completed_at", iso(2 * 36e5)).gte("completed_at", iso(7 * 864e5)) : Promise.resolve({ data: [] }),
    daytime ? q().not("quoted_at", "is", null).is("paid_at", null).is("unpaid_reminder_at", null).lte("quoted_at", iso(3 * 864e5)).gte("quoted_at", iso(30 * 864e5)) : Promise.resolve({ data: [] }),
  ] as PromiseLike<{ data: unknown }>[])) as { data: Q[] | null }[];
  const sheetsDue = (r2.data ?? []).filter((x) => x.job_sheet_employee_id !== x.assigned_employee_id);
  return {
    receipts: await receipts(r1.data ?? []),
    job_sheets: await jobSheets(sheetsDue, staff),
    reminders: await reminders((r3.data ?? []) as Q[], staff),
    thanks: await thanks(r4.data ?? []),
    unpaid: await unpaid(r5.data ?? []),
  };
}

Deno.serve(async (req) => withCors(req, rejectForeignOrigin(req) ?? await handle(req)));

async function handle(req: Request): Promise<Response> {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" },
  });
  if (req.method === "OPTIONS") return json({});
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const limit = await checkLimits(supabase, req, "automations", [
    { scope: "ip", windowSeconds: 3600, max: 120 },
    { scope: "global", windowSeconds: 3600, max: 400 },
  ]);
  if (limit === "limited") return json({ error: "rate_limited" }, 429);
  if (limit === "error") return json({ error: "unavailable" }, 503);
  try {
    return json({ ok: true, sent: await runAutomations() });
  } catch (err) {
    console.error("automations failed:", (err as Error).message);
    return json({ error: "server_error" }, 500);
  }
}
