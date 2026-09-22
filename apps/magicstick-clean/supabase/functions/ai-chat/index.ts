// Powers the "Chat with us" widget (js/ai-chat.js) on every page. Public,
// unauthenticated endpoint — visitors are never logged in when they open
// the chat — so it's deployed with --no-verify-jwt like the other
// customer-facing functions, and instead limits abuse with hard caps on
// message count/length and a small max_tokens on the reply.
//
// Required secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_ANON_KEY   (auto-provided on Supabase)
//   ANTHROPIC_API_KEY                  (console.anthropic.com API key)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-haiku-4-5-20251001";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_MESSAGES = 16;
const MAX_MESSAGE_LENGTH = 1200;

async function buildSystemPrompt(lang: "en" | "fr") {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: services } = await supabase
    .from("services")
    .select("name, name_fr, description, description_fr, base_price_cents, deposit_cents")
    .eq("active", true)
    .order("sort_order");

  const serviceLines = (services ?? [])
    .map((s) => {
      const name = lang === "fr" ? s.name_fr || s.name : s.name;
      const desc = lang === "fr" ? s.description_fr || s.description : s.description;
      const price = (s.base_price_cents / 100).toFixed(0);
      const deposit = (s.deposit_cents / 100).toFixed(0);
      return `- ${name}: ${desc} (from $${price} CAD, $${deposit} deposit to book online)`;
    })
    .join("\n");

  if (lang === "fr") {
    return `Tu es l'assistante virtuelle de MagicStick Clean, une entreprise de nettoyage résidentiel et commercial à Ottawa, Gatineau et Clarence-Rockland (Canada).

Ton style: chaleureux, humain, direct, jamais robotique. Des phrases courtes. Pas de jargon. Tu peux utiliser le prénom du client s'il te le donne.

Ce que tu sais faire:
- Répondre aux questions sur les services, les prix, les zones desservies et la façon de réserver.
- Orienter vers /quote.html pour une soumission gratuite, ou /booking.html pour réserver en ligne (dépôt requis).
- Rassurer sur l'assurance, la fiabilité, la flexibilité d'horaire.

Services et prix actuels:
${serviceLines || "(liste de services indisponible pour le moment)"}

Règles strictes:
- N'invente jamais de prix, de disponibilité précise ou de politique qui n'est pas mentionnée ici.
- Si tu ne sais pas, dis-le simplement et propose d'appeler le (343) 843-7761 ou magicstickclean@gmail.com.
- Réponses courtes (2-4 phrases), sauf si on te demande des détails.
- Ne jamais prétendre être un humain si on te le demande directement — dis que tu es l'assistante virtuelle du site, mais que l'équipe humaine répond aussi par téléphone/courriel.`;
  }

  return `You are the virtual assistant for MagicStick Clean, a residential & commercial cleaning business serving Ottawa, Gatineau, and Clarence-Rockland (Canada).

Your style: warm, human, direct, never robotic. Short sentences. No corporate jargon. Use the visitor's name if they give it to you.

What you can help with:
- Answering questions about services, pricing, service areas, and how booking works.
- Pointing people to /quote.html for a free quote, or /booking.html to book online (a deposit is required).
- Reassuring about insurance, reliability, and flexible scheduling.

Current services & pricing:
${serviceLines || "(service list temporarily unavailable)"}

Strict rules:
- Never invent a price, exact availability, or policy not listed above.
- If you don't know something, say so plainly and suggest calling (343) 843-7761 or emailing magicstickclean@gmail.com.
- Keep replies short (2-4 sentences) unless asked for detail.
- If asked directly, never claim to be a human — say you're the site's virtual assistant, and a real person answers by phone/email too.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
    }

    const body = await req.json();
    const lang = body.lang === "fr" ? "fr" : "en";
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];

    const messages = rawMessages
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-MAX_MESSAGES)
      .map((m: any) => ({
        role: m.role,
        content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
      }));

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return new Response(JSON.stringify({ error: "Expected at least one user message." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const system = await buildSystemPrompt(lang);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system,
        messages,
      }),
    });

    const data = await anthropicRes.json();
    if (!anthropicRes.ok) {
      console.error("Anthropic error:", anthropicRes.status, data);
      throw new Error(data?.error?.message ?? "The assistant is temporarily unavailable.");
    }

    const reply = (data.content ?? [])
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n")
      .trim();

    return new Response(JSON.stringify({ reply }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
