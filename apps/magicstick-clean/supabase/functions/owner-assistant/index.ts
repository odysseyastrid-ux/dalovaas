// PRIVATE owner assistant. Admin-only. Self-protects: requires a valid
// Supabase access token belonging to a row in admin_users. Separate from the
// public ai-chat widget — this is the owner's own AI co-pilot for any task
// (marketing, scheduling, copywriting, pricing math, drafting, strategy...).
// It is never exposed to website visitors.
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

// CORS: only the site itself may call this from a browser — same rule as
// guard.ts in the public functions (no Vercel preview URLs).
const ALLOWED_ORIGINS = new Set(["https://magicstickclean.ca", "https://www.magicstickclean.ca"]);
function withCors(req: Request, res: Response): Response {
  const headers = new Headers(res.headers);
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  else headers.delete("Access-Control-Allow-Origin");
  headers.append("Vary", "Origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 4000;

// Google review requests. Same link and wording as the admin "Ask for review"
// window (js/admin.js); the dashboard stamps bookings.review_requested_at.
const REVIEW_LINK = "https://g.page/r/CXlL7jiMiQp2EBI/review";
const REVIEW_TEMPLATE_FR = `Bonjour [Prénom] ! Merci de nous avoir fait confiance 😊 Votre opinion sur Magicstick Clean nous intéresse : si vous êtes satisfait·e, pourriez-vous publier un avis sur notre fiche Google ? Ça prend 30 secondes : ${REVIEW_LINK} Merci ! L’équipe Magicstick Clean · (343) 843-7761`;
const REVIEW_TEMPLATE_EN = `Hi [First name]! Thank you for trusting us 😊 Your opinion of Magicstick Clean matters to us: if you’re happy with the result, could you post a review on our Google listing? It takes 30 seconds: ${REVIEW_LINK} Thank you! The Magicstick Clean team · (343) 843-7761`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request, supabase: any): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: adminRow } = await supabase
    .from("admin_users").select("id").eq("id", data.user.id).maybeSingle();
  return adminRow ? data.user.id : null;
}

async function buildContext(supabase: any, lang: "en" | "fr"): Promise<string> {
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const iso = monthStart.toISOString();

  const [{ data: services }, { data: knowledge }, bookingsMonth, quotesMonth, pendingBookings, { data: reviewDue }, reviewsAsked] = await Promise.all([
    supabase.from("services").select("name, base_price_cents, first_booking_price_cents, deposit_cents, active").order("sort_order"),
    supabase.from("ai_knowledge").select("content, content_fr").eq("id", "owner").maybeSingle(),
    supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", iso),
    supabase.from("quote_requests").select("id", { count: "exact", head: true }).gte("created_at", iso),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
    supabase.from("bookings").select("guest_name, guest_contact, requested_date, services(name)")
      .eq("status", "completed").is("review_requested_at", null)
      .order("requested_date", { ascending: false }).limit(15),
    supabase.from("bookings").select("id", { count: "exact", head: true }).not("review_requested_at", "is", null),
  ]);

  const svc = (services ?? []).filter((s: any) => s.active).map((s: any) => {
    const disc = s.first_booking_price_cents;
    const eff = (disc && disc > 0 && disc < s.base_price_cents) ? disc : s.base_price_cents;
    return `  - ${s.name}: $${(eff / 100).toFixed(2)} (3h min), deposit $${(s.deposit_cents / 100).toFixed(0)}`;
  }).join("\n");

  // First name + date + channel only: the owner sends from the dashboard button.
  const dueLines = (reviewDue ?? []).map((b: any) => {
    const first = String(b.guest_name ?? "").trim().split(/\s+/)[0] || "(no name)";
    const contact = String(b.guest_contact ?? "");
    const channel = /@/.test(contact) ? "email" : (contact.replace(/\D/g, "").length >= 10 ? "text/WhatsApp" : "copy");
    return `  - ${first} — ${b.services?.name ?? "cleaning"} on ${b.requested_date} — via ${channel}`;
  }).join("\n");

  const owner = (lang === "fr" ? knowledge?.content_fr : knowledge?.content) || knowledge?.content || "";

  return [
    "BUSINESS SNAPSHOT (live data, for your reference):",
    `- Business: Magicstick Clean, residential & commercial cleaning, serving Clarence-Rockland, Ottawa, Gatineau.`,
    `- Owner contact: (343) 843-7761, magicstickclean@gmail.com, magicstickclean.ca`,
    `- Pricing model: $30/h standard (Deep $43/h, Post-construction & Move-in/out $50/h), 3-hour minimum; recurring plans $27/h (10% off); Window & glass + outdoor/seasonal 15% off.`,
    "- Active services:",
    svc || "  (none)",
    `- Bookings created this month: ${bookingsMonth?.count ?? 0}`,
    `- Quote requests this month: ${quotesMonth?.count ?? 0}`,
    `- Bookings awaiting payment right now: ${pendingBookings?.count ?? 0}`,
    "",
    "GOOGLE REVIEW REQUESTS:",
    `- Direct review link: ${REVIEW_LINK}`,
    `- Ready message (FR): ${REVIEW_TEMPLATE_FR}`,
    `- Ready message (EN): ${REVIEW_TEMPLATE_EN}`,
    "- How to send in one click: dashboard > \"Quotes, bookings & services\" / \"Devis, réservations & services\" > Bookings tab > the client's \"Ask for review\" / \"Demander un avis\" button (or the purple \"Ask for a Google review\" / \"Demander un avis Google\" box above the table), then Text, WhatsApp, Email or Copy. Sending marks the client as asked.",
    "- Rules: only after a completed cleaning; never offer anything in exchange (Google policy); one polite reminder at most; never write a review yourself or suggest fake ones.",
    `- Clients already asked: ${reviewsAsked?.count ?? 0}`,
    "- Completed cleanings whose client has NOT been asked yet:",
    dueLines || "  (none right now)",
    owner.trim() ? `\nOWNER'S SAVED NOTES & INSTRUCTIONS (treat as authoritative):\n${owner.trim()}` : "",
  ].join("\n");
}

Deno.serve(async (req) => withCors(req, await handle(req)));

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured on the server.");
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const adminId = await requireAdmin(req, supabase);
    if (!adminId) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const lang = body.lang === "fr" ? "fr" : "en";
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = rawMessages
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-MAX_MESSAGES)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, MAX_MESSAGE_LENGTH) }));

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return json({ error: "Expected at least one user message." }, 400);
    }

    const context = await buildContext(supabase, lang);

    const system = (lang === "fr"
      ? `Tu es l'assistant personnel privé et le copilote d'affaires du propriétaire de Magicstick Clean. Cet espace est PRIVÉ : les clients et les visiteurs du site ne le voient jamais. Tu aides pour N'IMPORTE QUELLE tâche, même sans rapport avec le site: marketing et publicité, rédaction (courriels, publications, soumissions, devis), idées d'affaires et stratégie, calculs de prix et de rentabilité, planification et horaires, ressources humaines, suivis clients, comptabilité de base, brainstorming, etc. Sois direct, concret et pratique. Donne des réponses actionnables; pose une brève question seulement si c'est vraiment nécessaire. Tu peux être plus long quand la tâche le demande (listes, plans, brouillons). Réponds dans la langue du propriétaire.`
      : `You are the private personal assistant and business co-pilot for the owner of Magicstick Clean. This is a PRIVATE workspace: clients and website visitors never see it. You help with ANY task, even unrelated to the website: marketing and ads, writing (emails, posts, quotes, estimates), business ideas and strategy, pricing and profitability math, scheduling and planning, hiring, client follow-ups, basic bookkeeping notes, brainstorming, and more. Be direct, concrete and practical. Give actionable answers; ask a brief clarifying question only when truly needed. You can go longer when the task calls for it (lists, plans, drafts). Reply in the owner's language.`)
      + "\n\n" + context;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1800,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      console.error("Groq error:", groqRes.status, data?.error?.type ?? data?.error?.code ?? "unknown");
      throw new Error(data?.error?.message ?? "The assistant is temporarily unavailable.");
    }
    const reply = (data.choices?.[0]?.message?.content ?? "").trim();
    return json({ reply });
  } catch (err) {
    console.error(err);
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
}
