// Pure helpers for owner-agent ("Bulle"): which actions the dashboard accepts and
// how the model's answer is split. Kept apart so tests can import them.
export const AUTOMATION_KINDS = ["receipts", "job_sheets", "reminders", "thanks", "unpaid", "confirmations",
  "deposit_receipts", "deposit_reminders", "owner_deposit_alerts", "invoices", "balance_reminders", "prospects"];
export const SECTIONS = ["home", "orders", "clients", "growth", "gifts", "team", "settings", "care", "assistant"];
const WINDOWS = ["Morning (8am–11am)", "Midday (11am–2pm)", "Afternoon (2pm–5pm)"];
const PROSPECT_STATUSES = ["todo", "contacted", "interested", "client", "not_interested", "do_not_contact"];

type Action = Record<string, unknown> & { type: string; label: string };
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Keeps only actions the dashboard knows how to run, with clean fields.
export function cleanActions(raw: unknown, ids: { quotes: Set<string>; prospects: Set<string>; growth: Set<string> }): Action[] {
  if (!Array.isArray(raw)) return [];
  const out: Action[] = [];
  for (const a of raw.slice(0, 20)) {
    if (out.length >= 6) break;
    if (!a || typeof a !== "object") continue;
    const x = a as Record<string, unknown>;
    const type = str(x.type, 30);
    const label = str(x.label, 140) || type;
    const q = str(x.quote_id, 40);
    const hasQ = ids.quotes.has(q);
    if (type === "open_section" && SECTIONS.includes(str(x.section, 20))) out.push({ type, label, section: str(x.section, 20) });
    else if (type === "send_price" && hasQ && Number(x.amount) > 0 && Number(x.amount) < 20000)
      out.push({ type, label, quote_id: q, amount: Math.round(Number(x.amount) * 100) / 100, note: str(x.note, 600), sensitive: true });
    else if (type === "schedule" && hasQ && /^\d{4}-\d{2}-\d{2}$/.test(str(x.date, 10)))
      out.push({ type, label, quote_id: q, date: str(x.date, 10), window: WINDOWS.includes(str(x.window, 40)) ? str(x.window, 40) : null });
    else if ((type === "mark_paid" || type === "mark_done") && hasQ) out.push({ type, label, quote_id: q, sensitive: type === "mark_paid" });
    else if (type === "prospect" && ids.prospects.has(str(x.prospect_id, 40)) && PROSPECT_STATUSES.includes(str(x.status, 20)))
      out.push({ type, label, prospect_id: str(x.prospect_id, 40), status: str(x.status, 20), days: Math.max(0, Math.min(60, Number(x.days) || 0)) });
    else if (type === "growth_tick" && ids.growth.has(str(x.key, 60))) out.push({ type, label, key: str(x.key, 60) });
    else if (type === "automation" && AUTOMATION_KINDS.includes(str(x.kind, 30))) {
      const act: Action = { type, label, kind: str(x.kind, 30), sensitive: true };
      if (typeof x.enabled === "boolean") act.enabled = x.enabled;
      if (typeof x.intro_fr === "string") act.intro_fr = str(x.intro_fr, 600);
      if (typeof x.intro_en === "string") act.intro_en = str(x.intro_en, 600);
      out.push(act);
    } else if (type === "message" && ["sms", "email", "copy"].includes(str(x.channel, 10)) && str(x.text, 2000))
      out.push({ type, label, channel: str(x.channel, 10), text: str(x.text, 2000), subject: str(x.subject, 140), quote_id: hasQ ? q : null, sensitive: true });
  }
  return out;
}

// The model writes its answer, then optionally one ```actions [...]``` block.
export function splitReply(text: string): { reply: string; actions: unknown } {
  const m = text.match(/```actions\s*([\s\S]*?)```/i);
  if (!m) return { reply: text.trim(), actions: [] };
  let actions: unknown = [];
  try { actions = JSON.parse(m[1]); } catch { actions = []; }
  return { reply: text.replace(m[0], "").trim(), actions };
}

