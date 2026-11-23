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
//   confirm   a date is set (or changed)           -> booking confirmation
//
// Partner agencies (migration 0031) pay a deposit before the job and the
// balance from the hours actually worked:
//   deposit receipt   deposit marked received        -> partner
//   deposit reminder  job in 2 days, deposit unpaid  -> partner (once)
//   owner alert       job tomorrow, deposit unpaid   -> owner (once)
//   invoice           done with final hours          -> partner (balance, due date)
//   balance reminder  invoice unpaid after the terms -> partner (once)
// Partner orders never get the "unpaid price" reminder or the review request.
//
//   prospects  every day from 8 a.m. Eastern, once  -> owner: who to contact today
//              (follow-ups due + new prospects, max 10). Nothing goes to prospects.
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

const total = (q: Q) => Number(q.final_amount_cents ?? q.quoted_amount_cents ?? 0);
const depositPaid = (q: Q) => (q.deposit_paid_at ? Number(q.deposit_cents ?? 0) : 0);
const hoursTxt = (h: unknown, fr: boolean) => String(Number(h)).replace(".", fr ? "," : ".");
const payLink = (q: Q, fr: boolean) => `${SITE}/pay.html?code=${q.pay_code}&lang=${fr ? "fr" : "en"}`;
const interacLine = (q: Q, cents: number, fr: boolean) => fr
  ? `Par virement Interac à <strong>magicstickclean@gmail.com</strong>, montant <strong>${esc(cad(cents, true))}</strong>, avec le numéro de commande <strong>${esc(prettyCode(q.pay_code ?? ""))}</strong> en message.`
  : `By Interac e-Transfer to <strong>magicstickclean@gmail.com</strong>, amount <strong>${esc(cad(cents, false))}</strong>, with order number <strong>${esc(prettyCode(q.pay_code ?? ""))}</strong> in the message.`;

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
        ? [`Nous avons bien reçu votre paiement${q.partner_id ? " (total de la facture)" : ""} de <strong>${esc(cad(total(q), true))}</strong> ${esc(method)} pour : ${esc(svc(q, true))}.`, `Numéro de commande : <strong>${esc(prettyCode(q.pay_code ?? ""))}</strong>`, q.completed_at ? "Merci pour votre confiance, au plaisir de travailler de nouveau ensemble." : q.scheduled_date ? `Votre ménage est prévu le <strong>${esc(dayText(q.scheduled_date, true))}</strong> (${esc(windowText(q.scheduled_window, true))}).` : "Nous vous confirmons la date et l’heure de la visite très bientôt."]
        : [`We received your payment${q.partner_id ? " (invoice total)" : ""} of <strong>${esc(cad(total(q), false))}</strong> ${esc(method)} for: ${esc(svc(q, false))}.`, `Order number: <strong>${esc(prettyCode(q.pay_code ?? ""))}</strong>`, q.completed_at ? "Thank you for your trust, we look forward to working together again." : q.scheduled_date ? `Your cleaning is scheduled for <strong>${esc(dayText(q.scheduled_date, false))}</strong> (${esc(windowText(q.scheduled_window, false))}).` : "We’ll confirm the date and time of your visit very soon."],
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

// Booking confirmation: sent when a date is set, and again if it changes.
async function confirmations(rows: Q[]) {
  let n = 0;
  for (const q of rows) {
    const to = clientEmail(q);
    const { data } = await supabase.from("quote_requests").update({ confirmation_date: q.scheduled_date })
      .eq("id", q.id).eq("scheduled_date", q.scheduled_date)
      .or(`confirmation_date.is.null,confirmation_date.neq.${q.scheduled_date}`).select("id");
    if (!data || data.length !== 1 || !to) continue;
    const fr = q.lang !== "en";
    const lines = [
      `<strong>${fr ? "Quand" : "When"} :</strong> ${esc(dayText(q.scheduled_date, fr))} · ${esc(windowText(q.scheduled_window, fr))}`,
      `<strong>${fr ? "Adresse" : "Address"} :</strong> ${esc(q.address || q.zone || (fr ? "à confirmer" : "to be confirmed"))}`,
      `<strong>Service :</strong> ${esc(svc(q, fr))}`,
    ];
    let button: { href: string; label: string } | undefined;
    if (q.partner_id) {
      const rate = Number(q.hourly_rate_cents ?? 0);
      if (q.estimated_hours && rate) {
        lines.push(fr
          ? `<strong>Estimation :</strong> ${esc(hoursTxt(q.estimated_hours, true))} h × ${esc(cad(rate, true))}/h = ${esc(cad(Number(q.quoted_amount_cents ?? 0), true))}. Facturé selon les heures réellement faites (minimum 3 h), produits et équipement inclus.`
          : `<strong>Estimate:</strong> ${esc(hoursTxt(q.estimated_hours, false))} h × ${esc(cad(rate, false))}/h = ${esc(cad(Number(q.quoted_amount_cents ?? 0), false))}. Billed on the hours actually worked (3-hour minimum), all supplies and equipment included.`);
      }
      const dep = Number(q.deposit_cents ?? 0);
      if (dep > 0 && !q.deposit_paid_at) {
        lines.push(fr
          ? `<strong>Acompte à payer avant le ménage : ${esc(cad(dep, true))}.</strong> Le ménage commence une fois l’acompte reçu. Le solde est facturé à la fin, selon les heures réelles.`
          : `<strong>Deposit due before the cleaning: ${esc(cad(dep, false))}.</strong> The job starts once the deposit is received. The balance is invoiced at the end, based on the actual hours.`);
        lines.push(interacLine(q, dep, fr));
        if (q.pay_code) button = { href: payLink(q, fr), label: fr ? "Voir ma commande" : "View my order" };
      } else if (dep > 0) {
        lines.push(fr ? `Acompte de ${esc(cad(dep, true))} reçu, merci.` : `Deposit of ${esc(cad(dep, false))} received, thank you.`);
      }
    } else if (q.paid_at) {
      lines.push(fr ? "C’est payé, merci." : "It’s paid, thank you.");
    } else if (q.quoted_amount_cents && q.pay_code) {
      lines.push(fr ? `Prix : <strong>${esc(cad(q.quoted_amount_cents, true))}</strong>, payable en ligne ou le jour du ménage.` : `Price: <strong>${esc(cad(q.quoted_amount_cents, false))}</strong>, payable online or on the day.`);
      button = { href: payLink(q, fr), label: fr ? "Voir et payer ma commande" : "View and pay my order" };
    }
    lines.push(fr ? "Pour bien préparer la visite, répondez à ce courriel avec : le stationnement, l’accès (clé, code), les animaux, et quelques photos (cuisine, salles de bain, planchers, entrée)."
      : "To prepare the visit, reply to this email with: parking, access (key, code), pets, and a few photos (kitchen, bathrooms, main floors, entryway).");
    const ok = await send(to, fr ? `Rendez-vous confirmé : ${dayText(q.scheduled_date, true)} — Magicstick Clean` : `Booking confirmed: ${dayText(q.scheduled_date, false)} — Magicstick Clean`,
      fr ? "Votre rendez-vous est confirmé" : "Your booking is confirmed", lines, fr, button);
    if (ok) n++;
    else await supabase.from("quote_requests").update({ confirmation_date: null }).eq("id", q.id);
  }
  return n;
}

async function depositReceipts(rows: Q[]) {
  let n = 0;
  for (const q of rows) {
    const to = clientEmail(q);
    if (!(await claim(q.id, "deposit_receipt_at")) || !to) continue;
    const fr = q.lang !== "en";
    const ok = await send(to, fr ? "Acompte reçu — Magicstick Clean" : "Deposit received — Magicstick Clean",
      fr ? "Acompte reçu, c’est confirmé" : "Deposit received, you’re confirmed",
      fr
        ? [`Nous avons bien reçu l’acompte de <strong>${esc(cad(Number(q.deposit_cents ?? 0), true))}</strong> pour la commande <strong>${esc(prettyCode(q.pay_code ?? ""))}</strong>.`, q.scheduled_date ? `Rendez-vous : <strong>${esc(dayText(q.scheduled_date, true))}</strong>, ${esc(windowText(q.scheduled_window, true))}, ${esc(q.address || "")}.` : "", "Le solde vous sera facturé à la fin du ménage, selon les heures réellement faites."].filter(Boolean)
        : [`We received the deposit of <strong>${esc(cad(Number(q.deposit_cents ?? 0), false))}</strong> for order <strong>${esc(prettyCode(q.pay_code ?? ""))}</strong>.`, q.scheduled_date ? `Booking: <strong>${esc(dayText(q.scheduled_date, false))}</strong>, ${esc(windowText(q.scheduled_window, false))}, ${esc(q.address || "")}.` : "", "The balance will be invoiced when the job is done, based on the hours actually worked."].filter(Boolean),
      fr);
    if (ok) n++; else await release(q.id, "deposit_receipt_at");
  }
  return n;
}

async function depositReminders(rows: Q[]) {
  let n = 0;
  for (const q of rows) {
    const to = clientEmail(q);
    if (!(await claim(q.id, "deposit_reminder_at")) || !to) continue;
    const fr = q.lang !== "en";
    const dep = Number(q.deposit_cents ?? 0);
    const ok = await send(to, fr ? "Rappel : acompte à payer avant le ménage" : "Reminder: deposit due before the cleaning",
      fr ? "Petit rappel pour l’acompte" : "A quick reminder about the deposit",
      [fr
        ? `Le ménage du <strong>${esc(dayText(q.scheduled_date, true))}</strong> (${esc(q.address || "")}) commence une fois l’acompte de <strong>${esc(cad(dep, true))}</strong> reçu.`
        : `The cleaning on <strong>${esc(dayText(q.scheduled_date, false))}</strong> (${esc(q.address || "")}) starts once the deposit of <strong>${esc(cad(dep, false))}</strong> is received.`,
      interacLine(q, dep, fr)],
      fr, q.pay_code ? { href: payLink(q, fr), label: fr ? "Voir ma commande" : "View my order" } : undefined);
    if (ok) n++; else await release(q.id, "deposit_reminder_at");
  }
  return n;
}

async function ownerDepositAlerts(rows: Q[], partners: Map<string, Q>) {
  let n = 0;
  for (const q of rows) {
    if (!(await claim(q.id, "owner_deposit_alert_at"))) continue;
    const p = partners.get(q.partner_id);
    const ok = await send(OWNER_EMAIL, `Acompte NON reçu : ${p?.name ?? q.name}, ménage du ${dayText(q.scheduled_date, true)}`,
      "Acompte pas encore reçu", [
        `${esc(p?.name ?? q.name)} n’a pas encore payé l’acompte de <strong>${esc(cad(Number(q.deposit_cents ?? 0), true))}</strong> pour le ménage du <strong>${esc(dayText(q.scheduled_date, true))}</strong> (${esc(q.address || "")}).`,
        "Votre règle : le travail commence une fois l’acompte reçu. Si le virement arrive, cliquez « Acompte reçu » dans Commandes.",
      ], true, { href: `${SITE}/admin.html`, label: "Ouvrir le tableau de bord" });
    if (ok) n++; else await release(q.id, "owner_deposit_alert_at");
  }
  return n;
}

async function invoices(rows: Q[], partners: Map<string, Q>) {
  let n = 0;
  for (const q of rows) {
    const to = clientEmail(q);
    if (!(await claim(q.id, "invoice_sent_at")) || !to) continue;
    const fr = q.lang !== "en";
    const p = partners.get(q.partner_id);
    const terms = Number(p?.payment_terms_days ?? 7);
    const due = new Date(new Date(q.completed_at).getTime() + terms * 864e5).toISOString().slice(0, 10);
    const balance = Math.max(0, total(q) - depositPaid(q));
    const rate = Number(q.hourly_rate_cents ?? 0);
    const billed = Math.max(3, Number(q.actual_hours ?? 0));
    const ok = await send(to, fr ? `Facture — commande ${prettyCode(q.pay_code ?? "")} — Magicstick Clean` : `Invoice — order ${prettyCode(q.pay_code ?? "")} — Magicstick Clean`,
      fr ? "Votre facture" : "Your invoice",
      fr
        ? [`Ménage du ${esc(q.scheduled_date ? dayText(q.scheduled_date, true) : "")}, ${esc(q.address || "")}.`,
           rate ? `Heures faites : <strong>${esc(hoursTxt(q.actual_hours, true))} h</strong>${Number(q.actual_hours) < 3 ? " (minimum facturé : 3 h)" : ""} × ${esc(cad(rate, true))}/h = <strong>${esc(cad(Math.round(billed * rate), true))}</strong>` : `Total : <strong>${esc(cad(total(q), true))}</strong>`,
           depositPaid(q) ? `Acompte déjà reçu : −${esc(cad(depositPaid(q), true))}` : "",
           `<strong>Solde à payer : ${esc(cad(balance, true))}</strong>${balance ? `, d’ici le <strong>${esc(dayText(due, true))}</strong>.` : " — rien à payer, merci !"}`,
           balance ? interacLine(q, balance, true) : ""].filter(Boolean)
        : [`Cleaning on ${esc(q.scheduled_date ? dayText(q.scheduled_date, false) : "")}, ${esc(q.address || "")}.`,
           rate ? `Hours worked: <strong>${esc(hoursTxt(q.actual_hours, false))} h</strong>${Number(q.actual_hours) < 3 ? " (3-hour minimum billed)" : ""} × ${esc(cad(rate, false))}/h = <strong>${esc(cad(Math.round(billed * rate), false))}</strong>` : `Total: <strong>${esc(cad(total(q), false))}</strong>`,
           depositPaid(q) ? `Deposit already received: −${esc(cad(depositPaid(q), false))}` : "",
           `<strong>Balance due: ${esc(cad(balance, false))}</strong>${balance ? `, by <strong>${esc(dayText(due, false))}</strong>.` : " — nothing to pay, thank you!"}`,
           balance ? interacLine(q, balance, false) : ""].filter(Boolean),
      fr, balance && q.pay_code ? { href: payLink(q, fr), label: fr ? "Voir ma commande" : "View my order" } : undefined);
    if (ok) n++; else await release(q.id, "invoice_sent_at");
  }
  return n;
}

async function balanceReminders(rows: Q[], partners: Map<string, Q>, now: Date) {
  let n = 0;
  for (const q of rows) {
    const terms = Number(partners.get(q.partner_id)?.payment_terms_days ?? 7);
    if (now.getTime() - new Date(q.completed_at).getTime() < terms * 864e5) continue;
    const to = clientEmail(q);
    if (!(await claim(q.id, "balance_reminder_at")) || !to) continue;
    const fr = q.lang !== "en";
    const balance = Math.max(0, total(q) - depositPaid(q));
    const ok = await send(to, fr ? `Rappel : solde de la commande ${prettyCode(q.pay_code ?? "")}` : `Reminder: balance for order ${prettyCode(q.pay_code ?? "")}`,
      fr ? "Petit rappel de paiement" : "A friendly payment reminder",
      [fr
        ? `Le solde de <strong>${esc(cad(balance, true))}</strong> pour le ménage du ${esc(q.scheduled_date ? dayText(q.scheduled_date, true) : "")} (${esc(q.address || "")}) n’a pas encore été reçu. S’il est déjà parti, merci et ne tenez pas compte de ce message.`
        : `The balance of <strong>${esc(cad(balance, false))}</strong> for the cleaning on ${esc(q.scheduled_date ? dayText(q.scheduled_date, false) : "")} (${esc(q.address || "")}) hasn’t arrived yet. If it’s already on its way, thank you, and please ignore this message.`,
      interacLine(q, balance, fr)],
      fr);
    if (ok) n++; else await release(q.id, "balance_reminder_at");
  }
  return n;
}

// Daily prospecting list for the owner (migration 0033): follow-ups that are
// due first, then prospects never contacted, 10 at most. Once a day, claimed
// in automation_log.
const CATEGORY_ORDER = ["agency", "airbnb", "property", "realtor", "contractor", "channel"];
const CATEGORY_FR: Record<string, string> = {
  agency: "Agence de ménage", airbnb: "Gestion Airbnb", property: "Gestion immobilière",
  realtor: "Courtier immobilier", contractor: "Entrepreneur", channel: "Où trouver des ménages",
};
export function pickProspects(rows: Q[], today: string, max = 10) {
  const due = rows.filter((p) => (p.status === "contacted" || p.status === "interested") && p.next_action_on && p.next_action_on <= today)
    .sort((a, b) => String(a.next_action_on).localeCompare(String(b.next_action_on)));
  const fresh = rows.filter((p) => p.status === "todo" && (!p.next_action_on || p.next_action_on <= today))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || String(a.created_at).localeCompare(String(b.created_at)));
  return [...due, ...fresh].slice(0, max);
}
async function prospectDigest(today: string) {
  const { data: rows, error } = await supabase.from("prospects")
    .select("id, name, category, area, phone, email, website, status, next_action_on, notes, created_at")
    .in("status", ["todo", "contacted", "interested"]).limit(500);
  if (error || !rows) return 0;
  const list = pickProspects(rows as Q[], today);
  if (!list.length) return 0;
  const { data: claimed } = await supabase.from("automation_log").upsert({ key: `prospect-digest:${today}` }, { onConflict: "key", ignoreDuplicates: true }).select("key");
  if (!claimed || claimed.length !== 1) return 0;
  const line = (p: Q) => [
    `<strong>${esc(p.name)}</strong> · ${esc(CATEGORY_FR[p.category] ?? p.category)}${p.area ? ` · ${esc(p.area)}` : ""}${p.status !== "todo" ? " · <em>relance</em>" : ""}`,
    p.phone ? `<a href="tel:${esc(String(p.phone).replace(/[^0-9+]/g, ""))}">${esc(p.phone)}</a>` : "",
    p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : "",
    p.website ? `<a href="${esc(p.website)}">site</a>` : "",
    p.notes ? `<span style="color:#6b7280">${esc(p.notes)}</span>` : "",
  ].filter(Boolean).join("<br>");
  const ok = await send(OWNER_EMAIL, `À contacter aujourd’hui : ${list.length} prospect${list.length > 1 ? "s" : ""}`,
    "Vos contacts du jour", [
      "Appelez d’abord, c’est ce qui marche le mieux. Après chaque contact, cliquez « Contacté » dans le tableau de bord : la relance se programme toute seule.",
      ...list.map(line),
    ], true, { href: `${SITE}/admin.html`, label: "Ouvrir la prospection" });
  if (!ok) await supabase.from("automation_log").delete().eq("key", `prospect-digest:${today}`);
  return ok ? list.length : 0;
}

export async function runAutomations(now = new Date()) {
  const { today, tomorrow, hour } = eastern(now);
  const daytime = hour >= 9 && hour < 20;
  const iso = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();
  const cols = "id, name, email, contact, phone, address, zone, service, frequency, home_type, home_size, bedrooms, bathrooms, pets, message, lang, status, quoted_amount_cents, quoted_at, pay_code, paid_at, payment_method, scheduled_date, scheduled_window, completed_at, review_requested_at, assigned_employee_id, job_sheet_employee_id, partner_id, estimated_hours, hourly_rate_cents, deposit_cents, deposit_paid_at, actual_hours, final_amount_cents, confirmation_date";
  const { data: staffRows } = await supabase.from("employees").select("id, name, email, active");
  const staff = new Map<string, Q>(((staffRows ?? []) as Q[]).filter((e) => e.active !== false).map((e) => [e.id, e] as [string, Q]));

  const { data: partnerRows } = await supabase.from("partners").select("id, name, payment_terms_days");
  const partners = new Map<string, Q>(((partnerRows ?? []) as Q[]).map((p) => [p.id, p] as [string, Q]));
  const in2days = (() => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 2); return d.toISOString().slice(0, 10); })();

  const q = () => supabase.from("quote_requests").select(cols).neq("status", "declined").limit(50);
  const [r1, r2, r3, r4, r5] = (await Promise.all([
    q().not("paid_at", "is", null).is("receipt_sent_at", null).gte("paid_at", iso(14 * 864e5)),
    q().not("assigned_employee_id", "is", null).is("completed_at", null).or(`scheduled_date.is.null,scheduled_date.gte.${today}`),
    hour >= 9 ? q().eq("scheduled_date", tomorrow).is("reminder_sent_at", null).is("completed_at", null) : Promise.resolve({ data: [] }),
    daytime ? q().is("partner_id", null).not("completed_at", "is", null).is("thanks_sent_at", null).lte("completed_at", iso(2 * 36e5)).gte("completed_at", iso(7 * 864e5)) : Promise.resolve({ data: [] }),
    daytime ? q().is("partner_id", null).not("quoted_at", "is", null).is("paid_at", null).is("unpaid_reminder_at", null).lte("quoted_at", iso(3 * 864e5)).gte("quoted_at", iso(30 * 864e5)) : Promise.resolve({ data: [] }),
  ] as PromiseLike<{ data: unknown }>[])) as { data: Q[] | null }[];
  const none = Promise.resolve({ data: [] });
  const [c1, p1, p2, p3, p4, p5] = (await Promise.all([
    q().not("scheduled_date", "is", null).gte("scheduled_date", today).is("completed_at", null),
    q().not("partner_id", "is", null).not("deposit_paid_at", "is", null).is("deposit_receipt_at", null),
    daytime ? q().not("partner_id", "is", null).gt("deposit_cents", 0).is("deposit_paid_at", null).is("deposit_reminder_at", null).is("completed_at", null).gte("scheduled_date", today).lte("scheduled_date", in2days).lte("quoted_at", iso(864e5)) : none,
    hour >= 9 ? q().not("partner_id", "is", null).gt("deposit_cents", 0).is("deposit_paid_at", null).is("owner_deposit_alert_at", null).is("completed_at", null).gte("scheduled_date", today).lte("scheduled_date", tomorrow) : none,
    daytime ? q().not("partner_id", "is", null).not("completed_at", "is", null).not("final_amount_cents", "is", null).is("invoice_sent_at", null).is("paid_at", null) : none,
    daytime ? q().not("partner_id", "is", null).not("invoice_sent_at", "is", null).is("paid_at", null).is("balance_reminder_at", null) : none,
  ] as PromiseLike<{ data: unknown }>[])) as { data: Q[] | null }[];
  const sheetsDue = (r2.data ?? []).filter((x) => x.job_sheet_employee_id !== x.assigned_employee_id);
  return {
    receipts: await receipts(r1.data ?? []),
    job_sheets: await jobSheets(sheetsDue, staff),
    reminders: await reminders((r3.data ?? []) as Q[], staff),
    thanks: await thanks(r4.data ?? []),
    unpaid: await unpaid(r5.data ?? []),
    confirmations: await confirmations((c1.data ?? []).filter((x) => x.confirmation_date !== x.scheduled_date)),
    deposit_receipts: await depositReceipts(p1.data ?? []),
    deposit_reminders: await depositReminders(p2.data ?? []),
    owner_deposit_alerts: await ownerDepositAlerts(p3.data ?? [], partners),
    invoices: await invoices(p4.data ?? [], partners),
    balance_reminders: await balanceReminders(p5.data ?? [], partners, now),
    prospects: hour >= 8 && hour < 20 ? await prospectDigest(today) : 0,
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
