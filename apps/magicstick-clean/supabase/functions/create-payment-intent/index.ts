// Called by booking.html once the visitor fills in the booking form.
// Creates a `bookings` row (status = pending_payment) and a Stripe
// PaymentIntent for the deposit, returning its client_secret so the page can
// mount Stripe's own embedded Payment Element and collect the card in place
// (no redirect to a Stripe-hosted page). The booking is only marked
// "confirmed" later, by the stripe-webhook function, once Stripe confirms
// the payment actually went through.
//
// The first-booking discount (regular $43.50/h vs $37/h, ~15% off) is
// decided here, server-side, from the booking history on file — never
// trusted from the client.
//
// Optional add-ons ("extras") and home size: the extras and their quantities
// are re-priced here from the service_addons table (never from the browser)
// and ADD to the booking total. The online deposit stays the service's fixed
// deposit — extras are collected at the appointment along with the rest.
//
// Gift cards: an optional code is checked here and the amount it will cover
// is *planned* on the booking. Nothing is deducted until the booking is
// confirmed — by stripe-webhook after payment, or right here when the card
// covers the whole deposit and there's nothing left to charge online.
//
// Required secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided on Supabase)
//   STRIPE_SECRET_KEY                          (Stripe secret key, sk_...)
//   RESEND_API_KEY, OWNER_EMAIL, OWNER_NOTIFY_FROM (gift-card-only confirmations)

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) : null;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "magicstickclean@gmail.com";
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "onboarding@resend.dev";

// Stripe won't charge less than $0.50 CAD — a smaller leftover deposit is
// simply moved to the balance due at the appointment instead.
const STRIPE_MIN_CHARGE_CENTS = 50;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeGiftCode(raw: unknown): string | null {
  let s = String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return null;
  if (s.startsWith("MSC")) s = s.slice(3);
  if (!/^[A-Z0-9]{12}$/.test(s)) return "invalid";
  return `MSC-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

function clampSize(v: unknown): number | null {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 20 ? n : null;
}

type AddonLine = {
  id: string; name: string; name_fr: string; unit: string;
  qty: number; unit_price_cents: number; line_cents: number;
};

// Re-price the selected add-ons from the database. `raw` is the client's
// [{ id, qty }] — only the ids and quantities are trusted; every price comes
// from service_addons here.
async function computeAddons(raw: unknown): Promise<{ list: AddonLine[]; cents: number }> {
  if (!Array.isArray(raw) || raw.length === 0) return { list: [], cents: 0 };
  const wanted = new Map<string, unknown>();
  for (const a of raw.slice(0, 30)) {
    const id = a && typeof a === "object" && typeof (a as Record<string, unknown>).id === "string"
      ? (a as Record<string, unknown>).id as string : null;
    if (id) wanted.set(id, (a as Record<string, unknown>).qty);
  }
  if (wanted.size === 0) return { list: [], cents: 0 };

  const { data } = await supabase
    .from("service_addons").select("*").eq("active", true).in("id", [...wanted.keys()]);
  const list: AddonLine[] = [];
  let cents = 0;
  for (const addon of (data ?? [])) {
    let qty = 1;
    if (addon.unit !== "flat") {
      const n = Math.floor(Number(wanted.get(addon.id)));
      qty = Number.isFinite(n) ? Math.max(addon.min_qty, Math.min(n, 50)) : addon.min_qty;
    }
    const line = addon.price_cents * qty;
    cents += line;
    list.push({
      id: addon.id, name: addon.name, name_fr: addon.name_fr, unit: addon.unit,
      qty, unit_price_cents: addon.price_cents, line_cents: line,
    });
  }
  return { list, cents };
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to, reply_to: OWNER_EMAIL, subject, text }),
  });
  if (!res.ok) console.error("Resend error:", res.status, await res.text());
}

async function getCustomerId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

async function isFirstBooking(customerId: string | null): Promise<boolean> {
  if (!customerId) return true;
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);
  return (count ?? 0) === 0;
}

function sizeLine(bedrooms: number | null, bathrooms: number | null, half: number | null): string {
  const parts: string[] = [];
  if (bedrooms !== null) parts.push(`${bedrooms} bed`);
  if (bathrooms !== null) parts.push(`${bathrooms} bath`);
  if (half) parts.push(`${half} half-bath`);
  return parts.length ? parts.join(", ") : "Not specified";
}

function addonsEmailLines(list: AddonLine[]): string[] {
  return list.map((a) => {
    const q = a.unit === "flat" ? "" : ` ×${a.qty}`;
    return `  • ${a.name}${q}: $${(a.line_cents / 100).toFixed(2)}`;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const {
      service_id,
      requested_date,
      time_window,
      guest_name,
      guest_contact,
      zone,
      notes,
    } = body;

    if (!service_id || !requested_date || !time_window || !guest_name || !guest_contact) {
      return json({ error: "Missing required fields." }, 400);
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("*")
      .eq("id", service_id)
      .eq("active", true)
      .single();

    if (serviceError || !service) {
      return json({ error: "Unknown service." }, 400);
    }

    const customerId = await getCustomerId(req);
    const firstBooking = await isFirstBooking(customerId);
    const serviceCents: number = firstBooking ? service.first_booking_price_cents : service.base_price_cents;

    const { list: addons, cents: addonsCents } = await computeAddons(body.addons);
    const totalCents = serviceCents + addonsCents;

    const bedrooms = clampSize(body.bedrooms);
    const bathrooms = clampSize(body.bathrooms);
    const halfBathrooms = clampSize(body.half_bathrooms);

    let giftCard: { id: string; code: string; balance_cents: number } | null = null;
    const giftCode = normalizeGiftCode(body.gift_card_code);
    if (giftCode === "invalid") return json({ error: "invalid_gift_card" }, 400);
    if (giftCode) {
      const { data } = await supabase
        .from("gift_cards").select("id, code, balance_cents, status").eq("code", giftCode).maybeSingle();
      if (!data || data.status !== "active" || data.balance_cents <= 0) {
        return json({ error: "invalid_gift_card" }, 400);
      }
      giftCard = data;
    }

    const giftPlanned = giftCard ? Math.min(giftCard.balance_cents, totalCents) : 0;
    let onlineDue = Math.max(0, service.deposit_cents - giftPlanned);
    if (onlineDue > 0 && onlineDue < STRIPE_MIN_CHARGE_CENTS) onlineDue = 0;

    if (onlineDue > 0 && !stripe) {
      throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        customer_id: customerId,
        guest_name,
        guest_contact,
        service_id: service.id,
        requested_date,
        time_window,
        zone: zone || null,
        notes: notes || "",
        status: "pending_payment",
        amount_cents: serviceCents,
        addons_cents: addonsCents,
        addons,
        bedrooms,
        bathrooms,
        half_bathrooms: halfBathrooms,
        deposit_cents: onlineDue,
        first_booking_discount_applied: firstBooking,
        gift_card_id: giftCard?.id ?? null,
        gift_card_planned_cents: giftPlanned,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw new Error(bookingError?.message ?? "Could not create booking.");
    }

    // Gift card covers everything due today: deduct it and confirm now.
    if (onlineDue === 0) {
      let applied = 0;
      if (giftCard) {
        const { data: redeemed, error: redeemError } = await supabase.rpc("redeem_gift_card", {
          p_card: giftCard.id, p_booking: booking.id, p_max: giftPlanned,
        });
        if (redeemError) throw new Error(redeemError.message);
        applied = redeemed ?? 0;
      }
      await supabase.from("bookings").update({
        status: "confirmed",
        paid_at: new Date().toISOString(),
        gift_card_applied_cents: applied,
      }).eq("id", booking.id);

      const remaining = ((totalCents - applied) / 100).toFixed(2);
      await sendEmail(
        OWNER_EMAIL,
        `Booking confirmed (gift card): ${guest_name}`,
        [
          `Booking confirmed for ${guest_name}`,
          `Service: ${service.name}`,
          `Date: ${requested_date} (${time_window})`,
          `Area: ${zone || "Not specified"}`,
          `Home: ${sizeLine(bedrooms, bathrooms, halfBathrooms)}`,
          ...(addons.length ? ["Extras:", ...addonsEmailLines(addons)] : []),
          `Total price: $${(totalCents / 100).toFixed(2)} CAD`,
          `Gift card ${giftCard?.code ?? ""}: -$${(applied / 100).toFixed(2)} CAD`,
          `Due at appointment: $${remaining} CAD`,
          `Contact: ${guest_contact}`,
          `Notes: ${notes || "(none)"}`,
        ].join("\n"),
      );
      if (isEmail(guest_contact)) {
        await sendEmail(
          guest_contact,
          "Your Magicstick Clean booking is confirmed",
          `Hi ${guest_name},\n\nYour booking is confirmed for ${requested_date} (${time_window}). Your gift card covered $${(applied / 100).toFixed(2)}${Number(remaining) > 0 ? ` — the remaining $${remaining} is due at the appointment` : " — nothing more is due"}.\n\nQuestions? Call or text 343-843-7761.\n\n— The Magicstick Clean team`,
        );
      }

      return json({
        confirmed: true,
        booking_id: booking.id,
        amount_cents: serviceCents,
        addons_cents: addonsCents,
        deposit_cents: 0,
        gift_card_applied_cents: applied,
        first_booking_discount_applied: firstBooking,
      });
    }

    const paymentIntent = await stripe!.paymentIntents.create({
      amount: onlineDue,
      currency: "cad",
      automatic_payment_methods: { enabled: true },
      description: `${service.name} — booking deposit (${requested_date}, ${time_window})`,
      metadata: { kind: "booking", booking_id: booking.id },
      receipt_email: isEmail(guest_contact) ? guest_contact : undefined,
    });

    await supabase
      .from("bookings")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", booking.id);

    return json({
      client_secret: paymentIntent.client_secret,
      booking_id: booking.id,
      amount_cents: serviceCents,
      addons_cents: addonsCents,
      deposit_cents: onlineDue,
      gift_card_planned_cents: giftPlanned,
      first_booking_discount_applied: firstBooking,
    });
  } catch (err) {
    console.error(err);
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});
