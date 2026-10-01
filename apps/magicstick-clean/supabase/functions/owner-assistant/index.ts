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

const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 4000;

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

  const [{ data: services }, { data: knowledge }, bookingsMonth, quotesMonth, pendingBookings] = await Promise.all([
    supabase.from("services").select("name, base_price_cents, first_booking_price_cents, deposit_cents, active").order("sort_order"),
    supabase.from("ai_knowledge").select("content, content_fr").eq("id", "owner").maybeSingle(),
    supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", iso),
    supabase.from("quote_requests").select("id", { count: "exact", head: true }).gte("created_at", iso),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
  ]);

  const svc = (services ?? []).filter((s: any) => s.active).map((s: any) => {
    const disc = s.first_booking_price_cents;
    const eff = (disc && disc > 0 && disc < s.base_price_cents) ? disc : s.base_price_cents;
    return `  - ${s.name}: $${(eff / 100).toFixed(2)} (3h min), deposit $${(s.deposit_cents / 100).toFixed(0)}`;
  }).join("\n");

  const owner = (lang === "fr" ? knowledge?.content_fr : knowledge?.content) || knowledge?.content || "";

  return [
    "BUSINESS SNAPSHOT (live data, for your reference):",
    `- Business: Magicstick Clean, residential & commercial cleaning, serving Clarence-Rockland, Ottawa, Gatineau.`,
    `- Owner contact: (343) 843-7761, magicstickclean@gmail.com, magicstickclean.ca`,
    `- Pricing model: $33/h standard (Deep $43/h, Post-construction & Move-in/out $50/h), 3-hour minimum; recurring plans $30/h (9% off); Window & glass + outdoor/seasonal 15% off.`,
    "- Active services:",
    svc || "  (none)",
    `- Bookings created this month: ${bookingsMonth?.count ?? 0}`,
    `- Quote requests this month: ${quotesMonth?.count ?? 0}`,
    `- Bookings awaiting payment right now: ${pendingBookings?.count ?? 0}`,
    owner.trim() ? `\nOWNER'S SAVED NOTES & INSTRUCTIONS (treat as authoritative):\n${owner.trim()}` : "",
  ].join("\n");
}

Deno.serve(async (req) => {
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
      console.error("Groq error:", groqRes.status, data);
      throw new Error(data?.error?.message ?? "The assistant is temporarily unavailable.");
    }
    const reply = (data.choices?.[0]?.message?.content ?? "").trim();
    return json({ reply });
  } catch (err) {
    console.error(err);
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});
