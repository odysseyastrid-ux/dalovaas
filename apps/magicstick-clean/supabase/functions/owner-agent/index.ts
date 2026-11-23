// "Bulle" — the owner's AI agent inside the dashboard (Nov 23, 2026).
// Completely separate from Louis (public chat, ai-chat). Admin-only: valid
// Supabase token + two-step sign-in (aal2) + a row in admin_users.
//
// It knows the public site (pages, offers, rules) and the live back office
// (orders, prospects, partners, growth, gift cards, team, supplies, automatic
// emails), can search the web (Groq built-in browser_search), and works like an
// employee with marketing, sales, call-center, cleaning and evaluation skills.
// It NEVER acts by itself: it returns proposed actions, and the dashboard runs
// one only when the owner clicks "Confirm".
//
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), GROQ_API_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const MODEL = "openai/gpt-oss-120b";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// CORS: only the site itself may call this from a browser (same rule as guard.ts).
const ALLOWED_ORIGINS = new Set(["https://magicstickclean.ca", "https://www.magicstickclean.ca"]);
function withCors(req: Request, res: Response): Response {
  const headers = new Headers(res.headers);
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  else headers.delete("Access-Control-Allow-Origin");
  headers.append("Vary", "Origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
function rejectForeignOrigin(req: Request): Response | null {
  const origin = req.headers.get("origin");
  if (origin === null || ALLOWED_ORIGINS.has(origin)) return null;
  return new Response(JSON.stringify({ error: "forbidden_origin" }), { status: 403, headers: { "Content-Type": "application/json" } });
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });

function passedTwoStep(token: string): boolean {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part + "=".repeat((4 - (part.length % 4)) % 4))).aal === "aal2";
  } catch {
    return false;
  }
}
async function requireAdmin(req: Request, supabase: any): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return false;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user || !passedTwoStep(token)) return false;
  const { data: row } = await supabase.from("admin_users").select("id").eq("id", data.user.id).maybeSingle();
  return !!row;
}

const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 4000;
import { AUTOMATION_KINDS, SECTIONS, cleanActions, splitReply } from "./logic.ts";

const first = (n: unknown) => String(n ?? "").trim().split(/\s+/)[0] || "?";
const day = (v: unknown) => (v ? String(v).slice(0, 10) : "");
function stageOf(q: any): string {
  if (q.status === "declined") return "cancelled";
  if (q.completed_at) return "done";
  if (q.scheduled_date) return "planned";
  if (q.paid_at) return "paid";
  if (q.quoted_amount_cents) return "priced";
  return "new";
}

async function buildContext(sb: any) {
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const [quotes, prospects, partners, growth, services, gifts, giftReq, jobs, leads, supplies, autos, views, knowledge, staff] = await Promise.all([
    sb.from("quote_requests").select("id, name, service, zone, home_size, frequency, message, lang, status, created_at, quoted_amount_cents, quoted_at, pay_code, paid_at, scheduled_date, scheduled_window, completed_at, partner_id, deposit_cents, deposit_paid_at, estimated_hours, assigned_employee_id, review_requested_at, source")
      .order("created_at", { ascending: false }).limit(60),
    sb.from("prospects").select("id, name, category, area, status, next_action_on, contact_count, notes").order("created_at").limit(80),
    sb.from("partners").select("id, name, hourly_rate_cents, deposit_percent, payment_terms_days, active"),
    sb.from("growth_checklist").select("key"),
    sb.from("services").select("name, base_price_cents, duration_minutes, active").order("sort_order"),
    sb.from("gift_cards").select("status, initial_cents, balance_cents, source"),
    sb.from("gift_card_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    sb.from("job_applications").select("id", { count: "exact", head: true }).eq("status", "new"),
    sb.from("newsletter_subscribers").select("id", { count: "exact", head: true }).is("unsubscribed_at", null),
    sb.from("supplies").select("name, quantity, min_quantity, unit"),
    sb.from("automation_settings").select("kind, enabled, intro_fr, intro_en"),
    sb.from("page_views").select("id", { count: "exact", head: true }).gte("at", since30),
    sb.from("ai_knowledge").select("id, content, content_fr"),
    sb.from("employees").select("id, name, active"),
  ]);
  const Q = (quotes.data ?? []) as any[];
  const P = (prospects.data ?? []) as any[];
  const partnerName = new Map(((partners.data ?? []) as any[]).map((p) => [p.id, p.name]));
  const staffName = new Map(((staff.data ?? []) as any[]).map((e) => [e.id, first(e.name)]));
  const money = (c: unknown) => (c ? `$${(Number(c) / 100).toFixed(2)}` : "-");
  // First name + order code only: no phone, email or address goes to the model.
  const orderLines = Q.map((q) => [
    `id=${q.id}`, `code=${q.pay_code ?? "-"}`, first(q.name), q.service, q.zone ?? "", q.home_size ?? "", q.frequency ?? "",
    `stage=${stageOf(q)}`, `asked=${day(q.created_at)}`, `price=${money(q.quoted_amount_cents)}`, q.paid_at ? `paid=${day(q.paid_at)}` : "",
    q.scheduled_date ? `date=${q.scheduled_date} ${q.scheduled_window ?? ""}` : "", q.completed_at ? `done=${day(q.completed_at)}` : "",
    q.partner_id ? `partner=${partnerName.get(q.partner_id) ?? "?"} deposit=${money(q.deposit_cents)}${q.deposit_paid_at ? " (received)" : " (NOT received)"}` : "",
    q.assigned_employee_id ? `cleaner=${staffName.get(q.assigned_employee_id) ?? "?"}` : "", `lang=${q.lang ?? "fr"}`,
    q.message ? `msg="${String(q.message).replace(/\s+/g, " ").slice(0, 140)}"` : "",
  ].filter(Boolean).join(" | "));
  const prospectLines = P.filter((p) => !["not_interested", "do_not_contact"].includes(p.status)).map((p) =>
    `id=${p.id} | ${p.name} | ${p.category} | ${p.area ?? ""} | ${p.status}${p.next_action_on ? ` next=${p.next_action_on}` : ""} | contacts=${p.contact_count ?? 0}${p.notes ? ` | ${String(p.notes).slice(0, 120)}` : ""}`);
  const svc = ((services.data ?? []) as any[]).filter((s) => s.active).map((s) =>
    `${s.name}: ${s.duration_minutes ? `$${((s.base_price_cents / 100) / (s.duration_minutes / 60)).toFixed(2)}/h` : money(s.base_price_cents)}`);
  const giftRows = (gifts.data ?? []) as any[];
  const low = ((supplies.data ?? []) as any[]).filter((s) => Number(s.quantity) <= Number(s.min_quantity)).map((s) => `${s.name} (${s.quantity} ${s.unit ?? ""})`);
  const autoMap = new Map(((autos.data ?? []) as any[]).map((a) => [a.kind, a]));
  const autoLines = AUTOMATION_KINDS.map((k) => {
    const a: any = autoMap.get(k);
    return `${k}: ${a?.enabled === false ? "PAUSED" : "on"}${a?.intro_fr ? ` | intro_fr="${a.intro_fr}"` : ""}${a?.intro_en ? ` | intro_en="${a.intro_en}"` : ""}`;
  });
  const know = new Map(((knowledge.data ?? []) as any[]).map((k) => [k.id, k]));
  const ownerNotes = (know.get("owner") as any)?.content_fr || (know.get("owner") as any)?.content || "";
  const growthDone = ((growth.data ?? []) as any[]).map((g) => g.key);
  const text = [
    `TODAY: ${new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" })} (Eastern time).`,
    "",
    "ORDERS (latest 60; id is what actions use):", ...(orderLines.length ? orderLines : ["(none)"]),
    "",
    "PROSPECTS (open):", ...(prospectLines.length ? prospectLines : ["(none)"]),
    "",
    "PARTNER AGENCIES:", ...((partners.data ?? []) as any[]).map((p) => `${p.name}: $${(p.hourly_rate_cents / 100).toFixed(2)}/h, deposit ${p.deposit_percent}% before the job, balance due ${p.payment_terms_days} days after${p.active === false ? " (inactive)" : ""}`),
    "",
    `GROWTH CHECKLIST done keys: ${growthDone.join(", ") || "none"} (other keys: signup-taskrabbit, signup-homestars, signup-bark, group-rockland, group-rockland-info, profile-text, fb-post).`,
    `INTERNAL RATES (never published on the site): ${svc.join("; ") || "-"}; 3-hour minimum; owner's floor $39.50/h; recurring plans ~10% off; first cleaning 20% off (one per household).`,
    `GIFT CARDS: ${giftRows.length} cards, ${giftRows.filter((g) => g.status === "active").length} active, sold online ${money(giftRows.filter((g) => g.source === "online").reduce((s, g) => s + (g.initial_cents || 0), 0))}; new gift-card requests: ${giftReq.count ?? 0}.`,
    `TEAM: ${((staff.data ?? []) as any[]).filter((e) => e.active !== false).map((e) => first(e.name)).join(", ") || "owner only"}; new job applicants: ${jobs.count ?? 0}.`,
    `LEADS (consented, subscribed): ${leads.count ?? 0}. WEBSITE VISITS (30 days): ${views.count ?? 0}.`,
    `SUPPLIES LOW: ${low.join(", ") || "none"}.`,
    "AUTOMATIC EMAILS (sent by the system; owner can pause or add an intro):", ...autoLines,
    ownerNotes.trim() ? `\nOWNER'S NOTES (authoritative):\n${ownerNotes.trim().slice(0, 3000)}` : "",
  ].join("\n");
  return {
    text,
    ids: {
      quotes: new Set(Q.map((q) => q.id)),
      prospects: new Set(P.map((p) => p.id)),
      growth: new Set(["signup-taskrabbit", "signup-homestars", "signup-bark", "group-rockland", "group-rockland-info", "profile-text", "fb-post"]),
    },
  };
}

const SYSTEM = (lang: "fr" | "en") => `You are "Bulle", the AI employee of Magicstick Clean, working inside the owner's private dashboard. You are NOT Louis (Louis is the public chat on the website; you never speak to clients directly).
Reply in ${lang === "fr" ? "French (Canadian, plain and warm; address the owner as « vous »)" : "English"}. Be short and concrete: the owner is busy and not technical. Use short paragraphs or bullet points.

THE BUSINESS (public site magicstickclean.ca)
- Owner-operated residential & commercial cleaning in Clarence-Rockland, Ottawa (incl. Orléans) and Gatineau only. Phone/text (343) 843-7761, magicstickclean@gmail.com. Bilingual EN/FR.
- Site funnel: free quote form (quote.html) → the owner sends a personalized price with a pay link (pay.html, Interac e-Transfer or card) → cleaning. Standard cleaning can also be booked and paid directly (book.html). Gift cards are sold online (gift-cards.html). Careers page for applicants. Location pages for Ottawa, Gatineau, Clarence-Rockland.
- Promises: free personalized quote, same-day reply, clear price before booking, supplies included, free re-clean guarantee, local & bilingual. No prices are ever published on the site. First cleaning 20% off (one per household).
- Partner agencies pay a deposit (50% by default) BEFORE the job; invoice after, from actual hours (3-hour minimum).
- The contest is cancelled: never mention or relaunch it. Never promise "the same cleaner every visit".

YOUR SKILLS
- Marketing: local SEO, Google Business Profile, Facebook groups, flyers, offers that are honest, content ideas, seasonal campaigns.
- Sales: follow-ups, closing, partner agencies, Airbnb hosts, property managers, objection handling, pricing strategy (respect the $39.50/h floor).
- Call center: phone/text scripts, voicemail scripts, polite answers to complaints, reschedules.
- Cleaning: methods, checklists per service (standard, deep, move-in/out, post-construction, Airbnb, office), products, safety, time estimates.
- Evaluation: estimate hours and price for a request from its size/service, quality-control checklists, review the business numbers and say what to improve.
- You can search the web (browser_search) for prospects, competitors, prices, local events, regulations. Cite the links you used.

HARD RULES
- Never invent data, reviews, ratings, insurance or certifications. Use only the live data below or what you found on the web (with its link).
- CASL: nothing is ever sent to prospects without the owner; first contact is made by the owner; always include an easy opt-out in a first email.
- Never create accounts or handle passwords. Never publish prices on the site.
- You do not act by yourself. When an action would help, PROPOSE it; the owner confirms each one with a button.

PROPOSING ACTIONS
After your answer, you may add ONE block exactly like this (JSON array, max 6), only with ids from the data below:
\`\`\`actions
[{"type":"send_price","quote_id":"<id>","amount":180,"note":"what is included","label":"Send $180 to Marie"}]
\`\`\`
Types and fields:
- open_section {section: home|orders|clients|growth|gifts|team|settings|care|assistant}
- send_price {quote_id, amount (dollars), note} — opens the price window pre-filled; the owner checks and sends.
- schedule {quote_id, date "YYYY-MM-DD", window "Morning (8am–11am)"|"Midday (11am–2pm)"|"Afternoon (2pm–5pm)"}
- mark_paid {quote_id} · mark_done {quote_id}
- prospect {prospect_id, status: contacted|interested|client|not_interested|do_not_contact|todo, days (follow-up in N days)}
- growth_tick {key}
- automation {kind, enabled true/false, intro_fr, intro_en} — pause/resume an automatic email or add a short intro paragraph.
- message {channel: sms|email|copy, quote_id (optional, to reach that client), subject, text} — a ready message the owner sends from their own phone or mailbox.
Every action needs a short "label" in the owner's language. Do not propose actions that were not asked for or are not clearly useful.`;

async function callGroq(messages: unknown[], withSearch: boolean): Promise<string | null> {
  const body: Record<string, unknown> = { model: MODEL, messages, temperature: 0.4, max_completion_tokens: 2200, reasoning_effort: "low" };
  if (withSearch) { body.tools = [{ type: "browser_search" }]; body.tool_choice = "auto"; }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { console.error("Groq error", res.status); return null; }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!GROQ_API_KEY) return json({ error: "not_configured" }, 503);
  const sb: any = (createClient as any)(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  if (!(await requireAdmin(req, sb))) return json({ error: "unauthorized" }, 401);
  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const lang: "fr" | "en" = payload?.lang === "en" ? "en" : "fr";
  const msgs = (Array.isArray(payload?.messages) ? payload.messages : [])
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json({ error: "bad_request" }, 400);
  const ctx = await buildContext(sb);
  const section = SECTIONS.includes(payload?.section) ? payload.section : "home";
  const messages = [
    { role: "system", content: SYSTEM(lang) },
    { role: "system", content: `LIVE BACK-OFFICE DATA (the owner is on the "${section}" tab):\n${ctx.text}` },
    ...msgs,
  ];
  // Web search is offered every time; if Groq refuses the tool, answer without it.
  const text = (await callGroq(messages, true)) ?? (await callGroq(messages, false));
  if (!text) return json({ error: "ai_unavailable" }, 502);
  const { reply, actions } = splitReply(text);
  return json({ reply, actions: cleanActions(actions, ctx.ids) });
}

Deno.serve(async (req) => withCors(req, rejectForeignOrigin(req) ?? await handle(req)));
