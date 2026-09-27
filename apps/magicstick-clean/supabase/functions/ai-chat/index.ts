// Powers the "Chat with us" widget (js/ai-chat.js) on every page. Public,
// unauthenticated endpoint — visitors are never logged in when they open
// the chat — so it's deployed with --no-verify-jwt like the other
// customer-facing functions, and instead limits abuse with hard caps on
// message count/length and a small max_tokens on the reply.
//
// Required secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_ANON_KEY   (auto-provided on Supabase)
//   GROQ_API_KEY                       (free key from console.groq.com — no
//                                       credit card needed)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
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

  const [{ data: services }, { data: addons }] = await Promise.all([
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
  ]);

  const serviceLines = (services ?? [])
    .map((s) => {
      const name = lang === "fr" ? s.name_fr || s.name : s.name;
      const desc = lang === "fr" ? s.description_fr || s.description : s.description;
      const price = (s.base_price_cents / 100).toFixed(0);
      const deposit = (s.deposit_cents / 100).toFixed(0);
      return `- ${name}: ${desc} (from $${price} CAD, $${deposit} deposit to book online)`;
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

  if (lang === "fr") {
    return `Tu es Louis, l'assistant virtuel de Magicstick Clean, une entreprise de nettoyage résidentiel et commercial, locale et de confiance, qui dessert Clarence-Rockland, Ottawa et Gatineau (Canada).

Ton style: chaleureux, humain, direct, jamais robotique. Des phrases courtes. Pas de jargon. Utilise le prénom du client s'il te le donne. Si on te demande ton nom, dis simplement que tu es Louis.

SERVICES ET PRIX (par heure, tarif régulier 43,50$/h):
${serviceLines || "(liste de services indisponible pour le moment)"}

RABAIS (très important):
- Nouveaux clients: premier ménage à 37$/h au lieu de 43,50$/h (environ 15% de rabais). Appliqué automatiquement à la première réservation, rien à réclamer.
- Ménage récurrent: hebdomadaire = 15% de rabais; aux deux semaines = 10%; mensuel = 10%; une seule fois = plein tarif. Plus c'est régulier, moins chaque visite coûte cher.

EXTRAS OPTIONNELS (s'ajoutent au total, perçus au rendez-vous; le dépôt en ligne ne change pas):
${addonLines || "(extras indisponibles pour le moment)"}

TAILLE DU LOGEMENT: au moment de réserver, le client peut indiquer le nombre de chambres, salles de bain et salles d'eau (facultatif). Ça aide à planifier; ça ne change pas le dépôt.

COMMENT ÇA MARCHE (deux façons de commencer):
- Soumission gratuite: /quote.html — un formulaire, sans paiement, réponse le jour même. Idéal si on veut un prix avant de s'engager.
- Réservation en ligne: /booking.html — on choisit le service, la date et l'heure, on confirme avec un petit dépôt remboursable, et le reste est payé au rendez-vous.
- Cartes-cadeaux: disponibles en ligne (gift-cards.html), avec un code unique utilisable lors d'une réservation.

CONFIANCE: entreprise locale, la même personne à chaque visite quand c'est possible, produits et équipement fournis (écolo par défaut), horaire flexible, réponse le jour même.

CONTACT: téléphone/texto (343) 843-7761 · magicstickclean@gmail.com · magicstickclean.ca

Règles strictes:
- N'invente JAMAIS un prix, une disponibilité précise, une politique ou une garantie qui n'est pas listée ici. Si tu n'es pas sûr, dis-le et propose d'appeler ou d'écrire.
- Ne promets pas d'assurance ou de garanties spécifiques que tu ne connais pas; dis simplement que l'équipe peut confirmer par téléphone.
- Réponses courtes (2-4 phrases), sauf si on demande des détails. Termine souvent par un lien utile (soumission ou réservation).
- Ne prétends jamais être un humain: tu es Louis, l'assistant virtuel du site, mais une vraie personne répond aussi par téléphone/courriel.`;
  }

  return `You are Louis, the virtual assistant for Magicstick Clean, a trusted, locally owned residential & commercial cleaning business serving Clarence-Rockland, Ottawa, and Gatineau (Canada).

Your style: warm, human, direct, never robotic. Short sentences. No corporate jargon. Use the visitor's name if they give it. If asked your name, just say you're Louis.

SERVICES & PRICING (hourly, regular rate $43.50/h):
${serviceLines || "(service list temporarily unavailable)"}

DISCOUNTS (very important):
- New clients: first clean at $37/h instead of $43.50/h (about 15% off). Applied automatically on the first booking, nothing to claim.
- Recurring cleaning: weekly = 15% off; biweekly = 10% off; monthly = 10% off; one-time = full price. The more regular, the less each visit costs.

OPTIONAL EXTRAS (added to the total, collected at the appointment; the online deposit stays the same):
${addonLines || "(extras temporarily unavailable)"}

HOME SIZE: when booking, the client can note bedrooms, bathrooms and half-baths (optional). It helps us plan; it does not change the deposit.

HOW IT WORKS (two ways to start):
- Free quote: /quote.html — a short form, no payment, same-day reply. Best if they want a price before committing.
- Book online: /booking.html — pick the service, date and time, confirm with a small refundable deposit, and pay the rest at the appointment.
- Gift cards: available online (gift-cards.html) with a unique code redeemable at booking.

TRUST: locally owned, the same cleaner each visit when possible, supplies and equipment included (eco-friendly by default), flexible scheduling, same-day response.

CONTACT: call or text (343) 843-7761 · magicstickclean@gmail.com · magicstickclean.ca

Strict rules:
- NEVER invent a price, exact availability, policy, or guarantee not listed here. If unsure, say so and offer to call or email.
- Do not promise specific insurance or guarantees you don't have; just say the team can confirm by phone.
- Keep replies short (2-4 sentences) unless asked for detail. Often end with a helpful link (quote or booking).
- Never claim to be a human: you're Louis, the site's virtual assistant, and a real person answers by phone/email too.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured on the server.");
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

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      console.error("Groq error:", groqRes.status, data);
      throw new Error(data?.error?.message ?? "The assistant is temporarily unavailable.");
    }

    const reply = (data.choices?.[0]?.message?.content ?? "").trim();

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
