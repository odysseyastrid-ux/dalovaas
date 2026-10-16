// Powers the public "Chat with us" widget. Unauthenticated endpoint.
// Pulls live services + add-ons from the DB, the owner's custom knowledge
// (ai_knowledge id='client'), and answers visitors. Hard caps limit abuse.
//
// Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY (auto), GROQ_API_KEY.

import { createClient } from "npm:@supabase/supabase-js@2";
import { checkLimits, readLimitedBody } from "./guard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// Service-role client used ONLY for the abuse counters (rate_limit_hit is
// not callable by anon/authenticated); page data is still read as anon.
const limiterDb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MAX_BODY_BYTES = 20_000;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const MODEL = "openai/gpt-oss-120b";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_MESSAGES = 16;
const MAX_MESSAGE_LENGTH = 1200;

async function buildSystemPrompt(lang: "en" | "fr") {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const [{ data: services }, { data: addons }, { data: knowledge }] = await Promise.all([
    supabase
      .from("services")
      .select("name, name_fr, description, description_fr, base_price_cents, first_booking_price_cents, deposit_cents")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("service_addons")
      .select("name, name_fr, price_cents, unit")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("ai_knowledge").select("content, content_fr").eq("id", "client").maybeSingle(),
  ]);

  const serviceLines = (services ?? [])
    .map((s) => {
      const name = lang === "fr" ? s.name_fr || s.name : s.name;
      const desc = lang === "fr" ? s.description_fr || s.description : s.description;
      const disc = s.first_booking_price_cents;
      const eff = (disc && disc > 0 && disc < s.base_price_cents) ? disc : s.base_price_cents;
      const price = (eff / 100).toFixed(0);
      const deposit = (s.deposit_cents / 100).toFixed(0);
      return `- ${name}: ${desc} (from $${price} CAD for a 3-hour minimum visit, $${deposit} deposit to book online)`;
    })
    .join("\n");

  const unitLabel = (u: string) =>
    lang === "fr"
      ? ({ flat: "forfait", window: "par fenêtre", room: "par pièce", load: "par brassée", hour: "par heure" }[u] ?? "")
      : ({ flat: "flat", window: "per window", room: "per room", load: "per load", hour: "per hour" }[u] ?? "");

  const addonLines = (addons ?? [])
    .map((a) => {
      const name = lang === "fr" ? a.name_fr || a.name : a.name;
      const price = (a.price_cents / 100).toFixed(0);
      return `- ${name}: $${price} ${unitLabel(a.unit)}`;
    })
    .join("\n");

  const ownerKnowledge = (lang === "fr" ? knowledge?.content_fr : knowledge?.content) || knowledge?.content || "";
  const knowledgeBlock = ownerKnowledge.trim()
    ? (lang === "fr"
        ? `\n\nINFOS SUPPLÉMENTAIRES FOURNIES PAR LE PROPRIÉTAIRE (fais-y confiance en priorité, elles priment sur les informations générales ci-dessus en cas de conflit) :\n${ownerKnowledge.trim()}`
        : `\n\nADDITIONAL INFO PROVIDED BY THE OWNER (trust this first; it overrides the general info above if they conflict):\n${ownerKnowledge.trim()}`)
    : "";

  if (lang === "fr") {
    return `Tu es Louis, l'assistant virtuel de Magicstick Clean, une entreprise de nettoyage résidentiel et commercial, locale et de confiance, qui dessert Clarence-Rockland, Ottawa et Gatineau (Canada).

Ton style: chaleureux, humain, direct, jamais robotique. Des phrases courtes. Pas de jargon. Utilise le prénom du client s'il te le donne. Si on te demande ton nom, dis simplement que tu es Louis.

TARIFS (minimum 3 heures par réservation):
- Nettoyage standard, Airbnb, commercial, fenêtres: 30 $/h.
- Nettoyage en profondeur: 43 $/h.
- Post-construction et déménagement (entrée/sortie): 50 $/h.
- Forfait RÉCURRENT (hebdomadaire, aux deux semaines ou mensuel): 27 $/h, soit 10% de rabais, tant que le forfait est maintenu.
- Nettoyage de fenêtres et vitres: rabais permanent de 15% (25,50 $/h).
- Extérieur et saisonnier: pelouse/terrain 50 $/h et déneigement 50 $/h, avec 15% de rabais permanent; sur devis.
- Il n'y a PAS de rabais spécial première réservation.

SERVICES (prix de départ pour une visite minimum de 3 heures):
${serviceLines || "(liste de services indisponible pour le moment)"}

EXTRAS OPTIONNELS (s'ajoutent au total, perçus au rendez-vous; le dépôt en ligne ne change pas):
${addonLines || "(extras indisponibles pour le moment)"}

COMMENT ÇA MARCHE:
- Soumission gratuite: /quote.html — un formulaire, sans paiement, réponse le jour même.
- Réservation en ligne: /booking.html — service, date, heure, petit dépôt remboursable, le reste payé au rendez-vous.
- Extérieur et saisonnier: /service-outdoor-seasonal.html.
- Cartes-cadeaux: gift-cards.html, code unique utilisable à la réservation.

CONTACT: téléphone/texto (343) 843-7761 · magicstickclean@gmail.com · magicstickclean.ca${knowledgeBlock}

Règles strictes:
- N'invente JAMAIS un prix, une disponibilité précise, une politique ou une garantie qui n'est pas listée ici ni dans les infos du propriétaire. Si tu n'es pas sûr, dis-le et propose d'appeler ou d'écrire.
- Réponses courtes (2-4 phrases), sauf si on demande des détails. Termine souvent par un lien utile.
- Ne prétends jamais être un humain: tu es Louis, l'assistant virtuel du site.`;
  }

  return `You are Louis, the virtual assistant for Magicstick Clean, a trusted, locally owned residential & commercial cleaning business serving Clarence-Rockland, Ottawa, and Gatineau (Canada).

Your style: warm, human, direct, never robotic. Short sentences. No corporate jargon. Use the visitor's name if they give it. If asked your name, just say you're Louis.

RATES (3-hour minimum per booking):
- Standard, Airbnb, commercial, windows: $30/h.
- Deep cleaning: $43/h.
- Post-construction and move-in/move-out: $50/h.
- RECURRING plan (weekly, biweekly or monthly): $27/h, that's 10% off, for as long as the plan is kept.
- Window & glass cleaning: permanent 15% discount ($25.50/h).
- Outdoor & seasonal: lawn/yard $50/h and snow removal $50/h, with a permanent 15% discount; by quote.
- There is NO special first-booking discount.

SERVICES (starting price for a 3-hour minimum visit):
${serviceLines || "(service list temporarily unavailable)"}

OPTIONAL EXTRAS (added to the total, collected at the appointment; the online deposit stays the same):
${addonLines || "(extras temporarily unavailable)"}

HOW IT WORKS:
- Free quote: /quote.html — a short form, no payment, same-day reply.
- Book online: /booking.html — pick service, date and time, confirm with a small refundable deposit, pay the rest at the appointment.
- Outdoor & seasonal: /service-outdoor-seasonal.html.
- Gift cards: gift-cards.html, a unique code redeemable at booking.

CONTACT: call or text (343) 843-7761 · magicstickclean@gmail.com · magicstickclean.ca${knowledgeBlock}

Strict rules:
- NEVER invent a price, exact availability, policy, or guarantee not listed here or in the owner's info. If unsure, say so and offer to call or email.
- Keep replies short (2-4 sentences) unless asked for detail. Often end with a helpful link (quote or booking).
- Never claim to be a human: you're Louis, the site's virtual assistant.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const fail = (status: number, code: string) =>
    new Response(JSON.stringify({ error: code }), {
      status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  try {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured on the server.");
    }

    // Each request costs a call to the model provider, so cap how many a
    // visitor — and the whole site — can make. Fails CLOSED if the counter
    // is unreachable. (The 16-message / 1200-character / 400-token caps below
    // only bound a single reply, not how many requests arrive.)
    const limited = await checkLimits(limiterDb, req, "chat", [
      { scope: "ip", windowSeconds: 600, max: 25 },
      { scope: "ip", windowSeconds: 86400, max: 150 },
      { scope: "global", windowSeconds: 3600, max: 800 },
    ]);
    if (limited === "limited") return fail(429, "rate_limited");
    if (limited === "error") return fail(503, "temporarily_unavailable");

    const text = await readLimitedBody(req, MAX_BODY_BYTES);
    if (text === null) return fail(413, "payload_too_large");
    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail(400, "invalid_body");
      body = parsed as Record<string, unknown>;
    } catch {
      return fail(400, "invalid_json");
    }
    const lang = body.lang === "fr" ? "fr" : "en";
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];

    const messages = rawMessages
      .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
      .slice(-MAX_MESSAGES)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, MAX_MESSAGE_LENGTH) }));

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return new Response(JSON.stringify({ error: "Expected at least one user message." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const system = await buildSystemPrompt(lang);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      // Provider detail stays in the server log only.
      console.error("Groq error:", groqRes.status, data);
      return fail(502, "assistant_unavailable");
    }

    const reply = (data.choices?.[0]?.message?.content ?? "").trim();
    return new Response(JSON.stringify({ reply }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return fail(500, "server_error");
  }
});
