// Fires on inserts into `event_outbox` (wired up as a Supabase Database
// Webhook — see docs/SETUP.md). Sends WhatsApp Business Cloud API messages
// to individual staff numbers, and a Web Push notification to the customer
// if they opted in.
//
// Note: the official Cloud API can only message individual numbers, not
// post into a regular WhatsApp group chat — there is no supported way to
// automate that. The frontend's semi-automated group flow (copy the order
// message, open the group invite link, a human pastes/sends) is the
// alternative for an actual shared group thread — see OrdersBoard.tsx and
// VITE_STAFF_WHATSAPP_GROUP_LINK.
//
// Required secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided on Supabase)
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID  (Meta WhatsApp Business Cloud API)
//   WHATSAPP_STAFF_NUMBERS                    (comma-separated E.164 numbers -- individual staff, not a group)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (Web Push)

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const WHATSAPP_STAFF_NUMBERS = (Deno.env.get("WHATSAPP_STAFF_NUMBERS") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:ops@chezsanji.example";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const FULFILLMENT_FR: Record<string, string> = {
  pickup: "À emporter",
  delivery: "Livraison",
  dine_in: "Sur place",
};

function buildStaffMessage(order: any, kind: string) {
  const grouped: Record<string, string[]> = {};
  for (const line of order.lines ?? []) {
    const cat = line.cat ?? "Autre";
    (grouped[cat] ??= []).push(`${line.qty}x ${line.name}`);
  }
  const itemsText = Object.entries(grouped).map(([cat, items]) => `${cat}: ${items.join(", ")}`).join("\n");
  const header = kind === "validated" ? "✅ Commande validée" : "🆕 Nouvelle commande";
  return [
    `${header} ${order.ref}`,
    `${order.customer_name ?? "—"} — ${order.customer_phone ?? "—"}`,
    `${FULFILLMENT_FR[order.fulfillment] ?? order.fulfillment} · Retrait: ${order.pickup_code}`,
    itemsText,
    `Total: ${order.total} FCFA`,
  ].join("\n");
}

async function sendWhatsAppText(to: string, body: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn("WhatsApp not configured — skipping send to", to);
    return;
  }
  const res = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) {
    console.error("WhatsApp send failed", to, await res.text());
  }
}

async function sendWebPush(subscription: any, payload: Record<string, unknown>) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !subscription) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    console.error("web push failed", err);
  }
}

const CUSTOMER_MESSAGES: Record<string, { title: string; body: (o: any) => string }> = {
  created: { title: "Commande reçue", body: (o) => `Votre commande ${o.ref} a bien été reçue.` },
  validated: { title: "Commande acceptée", body: (o) => `Votre commande ${o.ref} est en cours de préparation.` },
  ready: { title: "Commande prête", body: (o) => o.fulfillment === "delivery" ? `Commande ${o.ref} prête — en route !` : `Commande ${o.ref} prête à récupérer !` },
  delivered: { title: "Commande livrée", body: (o) => `Commande ${o.ref} livrée. Bon appétit !` },
};

Deno.serve(async (req) => {
  const payload = await req.json();
  const outboxRow = payload.record;
  if (!outboxRow) return new Response("ignored", { status: 200 });

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", outboxRow.order_id)
    .single();

  if (error || !order) {
    console.error("order lookup failed", error);
    return new Response("order not found", { status: 200 });
  }

  const kind = outboxRow.kind as string;

  // staff broadcast on new + validated orders
  if (kind === "created" || kind === "validated") {
    const msg = buildStaffMessage(order, kind);
    await Promise.all(WHATSAPP_STAFF_NUMBERS.map((n) => sendWhatsAppText(n, msg)));
  }

  // customer notification for every lifecycle event, if they opted in
  const { data: account } = await supabase
    .from("accounts")
    .select("phone, notif_order_updates, push_subscription")
    .eq("id", order.customer_id)
    .single();

  if (account?.notif_order_updates) {
    const tmpl = CUSTOMER_MESSAGES[kind];
    if (tmpl) {
      await sendWebPush(account.push_subscription, {
        title: tmpl.title,
        body: tmpl.body(order),
        tag: order.ref,
      });
      if (account.phone) {
        await sendWhatsAppText(account.phone, `${tmpl.title} — ${tmpl.body(order)}`);
      }
    }
  }

  await supabase.from("event_outbox").update({ processed_at: new Date().toISOString() }).eq("id", outboxRow.id);

  return new Response("ok", { status: 200 });
});
