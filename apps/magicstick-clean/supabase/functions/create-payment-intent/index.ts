// Called by booking.html once the visitor fills in the booking form.
// Creates a `bookings` row (status = pending_payment) and a Stripe
// PaymentIntent for the deposit, returning its client_secret so the page can
// mount Stripe's own embedded Payment Element and collect the card in place
// (no redirect to a Stripe-hosted page). The booking is only marked
// "confirmed" later, by the stripe-webhook function, once Stripe confirms
// the payment actually went through.
//
// Hardening (security audit S01/S04/S05/S06):
//  - rate limited per visitor and globally, failing CLOSED (guard.ts);
//  - strict input validation (validate.ts): real future date, allowed time
//    window, length limits, body size cap; public errors are generic codes;
//  - gift cards: the amount a card can cover is taken (held) from its CURRENT
//    balance inside one SQL transaction (reserve_booking_deposit). The booking
//    is confirmed here only if the deposit is truly covered; otherwise the
//    PaymentIntent is created for what is really still due;
//  - retries with the same idempotency_key return the same booking instead of
//    creating another one, and abandoned pending bookings are cancelled after
//    2 hours (their PaymentIntent is cancelled and the held gift-card amount is
//    given back).
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
// Required secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided on Supabase)
//   STRIPE_SECRET_KEY                          (Stripe secret key, sk_...)
//   RESEND_API_KEY, OWNER_EMAIL, OWNER_NOTIFY_FROM (gift-card-only confirmations)

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { checkLimits, readLimitedBody } from "./guard.ts";
import { isEmail, MAX_BODY_BYTES, validateBooking } from "./validate.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY.trim(), {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "magicstickclean@gmail.com";
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "onboarding@resend.dev";

// Stripe won't charge less than $0.50 CAD — a smaller leftover deposit is
// simply moved to the balance due at the appointment instead.
const STRIPE_MIN_CHARGE_CENTS = 50;
// A booking that never got paid is cancelled after this long.
const ABANDONED_AFTER = "2 hours";
const ABANDONED_AFTER_MS = 2 * 60 * 60 * 1000;

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

function normalizeGiftCode(raw: unknown): string | null {
  let s = String(raw ?? "").slice(0, 40).toUpperCase().replace(/[^A-Z0-9]/g, "");
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
    if (id) wanted.set(id.slice(0, 64), (a as Record<string, unknown>).qty);
  }
  if (wanted.size === 0) return { list: [], cents: 0 };

  const { data, error } = await supabase
    .from("service_addons").select("*").eq("active", true).in("id", [...wanted.keys()]);
  if (error) throw new Error(`addons lookup failed: ${error.message}`);
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

// Cancels bookings that were never paid (the visitor closed the tab): the
// PaymentIntent is cancelled first, then the booking, and any gift-card amount
// it was holding goes back to the card. A booking whose payment is succeeding
// or processing right now is left alone — the webhook will confirm it.
async function expireAbandoned() {
  try {
    const cutoff = new Date(Date.now() - ABANDONED_AFTER_MS).toISOString();
    const { data, error } = await supabase
      .from("bookings")
      .select("id, stripe_payment_intent_id")
      .eq("status", "pending_payment")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(10);
    if (error) throw new Error(error.message);
    for (const b of data ?? []) {
      try {
        if (b.stripe_payment_intent_id && stripe) {
          try {
            await stripe.paymentIntents.cancel(b.stripe_payment_intent_id);
          } catch (err) {
            const pi = await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id);
            if (pi.status === "succeeded" || pi.status === "processing") continue;
            if (pi.status !== "canceled") throw err;
          }
        }
        await supabase.rpc("expire_pending_booking", { p_booking: b.id, p_older_than: ABANDONED_AFTER });
      } catch (err) {
        console.error("could not expire booking", b.id, err);
      }
    }
  } catch (err) {
    console.error("expireAbandoned failed:", err);
  }
}

// Gives a half-created booking back (hold released, booking cancelled).
async function abandonNow(bookingId: string) {
  const { error } = await supabase.rpc("expire_pending_booking", { p_booking: bookingId, p_older_than: "0 seconds" });
  if (error) console.error("could not release booking", bookingId, error);
}

// Answers a retried request (same idempotency_key) from the booking that
// already exists instead of creating a second booking and PaymentIntent.
// deno-lint-ignore no-explicit-any
async function replay(existing: any): Promise<Response> {
  const common = {
    booking_id: existing.id,
    amount_cents: existing.amount_cents,
    addons_cents: existing.addons_cents ?? 0,
    first_booking_discount_applied: existing.first_booking_discount_applied,
  };
  if (existing.status === "confirmed") {
    return json({ confirmed: true, ...common, deposit_cents: 0, gift_card_applied_cents: existing.gift_card_applied_cents ?? 0 });
  }
  if (existing.status === "pending_payment" && existing.stripe_payment_intent_id && stripe) {
    const pi = await stripe.paymentIntents.retrieve(existing.stripe_payment_intent_id);
    if (["requires_payment_method", "requires_confirmation", "requires_action"].includes(pi.status)) {
      return json({
        client_secret: pi.client_secret, ...common,
        deposit_cents: existing.deposit_cents,
        gift_card_planned_cents: existing.gift_card_planned_cents ?? 0,
      });
    }
  }
  return json({ error: "checkout_unavailable" }, 409);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let createdBookingId: string | null = null;
  try {
    // 1. Abuse protection first — before parsing, pricing or any write.
    const limited = await checkLimits(supabase, req, "pay", [
      { scope: "ip", windowSeconds: 3600, max: 12 },
      { scope: "global", windowSeconds: 3600, max: 300 },
    ]);
    if (limited === "limited") return json({ error: "rate_limited" }, 429);
    if (limited === "error") return json({ error: "temporarily_unavailable" }, 503);

    // 2. Bounded, strictly validated input.
    const text = await readLimitedBody(req, MAX_BODY_BYTES);
    if (text === null) return json({ error: "payload_too_large" }, 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "invalid_json" }, 400);
    }
    const validated = validateBooking(body);
    if (!validated.ok) return json({ error: validated.error }, 400);
    const input = validated.value;

    // Housekeeping for earlier abandoned checkouts, off the request's path.
    // deno-lint-ignore no-explicit-any
    const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil;
    if (typeof waitUntil === "function") waitUntil.call((globalThis as any).EdgeRuntime, expireAbandoned());
    else await expireAbandoned();

    // 3. A retry of the same checkout returns the same booking.
    if (input.idempotency_key) {
      const { data: existing, error: lookupError } = await supabase
        .from("bookings").select("*").eq("idempotency_key", input.idempotency_key).maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      if (existing) return await replay(existing);
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("*")
      .eq("id", input.service_id)
      .eq("active", true)
      .maybeSingle();
    if (serviceError) throw new Error(serviceError.message);
    if (!service) return json({ error: "invalid_service" }, 400);

    const customerId = await getCustomerId(req);
    const firstBooking = await isFirstBooking(customerId);
    // A service whose first_booking_price is lower than base carries a standing
    // discount (e.g. Window & Glass Cleaning, 15% off) that applies to everyone,
    // every time — not just a first booking. Charge the lower of the two.
    const discPrice = service.first_booking_price_cents;
    const serviceCents: number =
      (discPrice && discPrice > 0 && discPrice < service.base_price_cents)
        ? discPrice
        : service.base_price_cents;

    const { list: addons, cents: addonsCents } = await computeAddons(body.addons);
    const totalCents = serviceCents + addonsCents;

    const bedrooms = clampSize(body.bedrooms);
    const bathrooms = clampSize(body.bathrooms);
    const halfBathrooms = clampSize(body.half_bathrooms);

    let giftCard: { id: string; code: string; balance_cents: number } | null = null;
    const giftCode = normalizeGiftCode(body.gift_card_code);
    if (giftCode === "invalid") return json({ error: "invalid_gift_card" }, 400);
    if (giftCode) {
      const { data, error } = await supabase
        .from("gift_cards").select("id, code, balance_cents, status").eq("code", giftCode).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data || data.status !== "active" || data.balance_cents <= 0) {
        return json({ error: "invalid_gift_card" }, 400);
      }
      giftCard = data;
    }

    // What the card is *expected* to cover — only a hint for the up-front
    // Stripe check. The real figures come from reserve_booking_deposit below.
    const giftPlanned = giftCard ? Math.min(giftCard.balance_cents, totalCents) : 0;
    if (!stripe && service.deposit_cents - giftPlanned >= STRIPE_MIN_CHARGE_CENTS) {
      console.error("STRIPE_SECRET_KEY is not configured on the server.");
      return json({ error: "payments_unavailable" }, 503);
    }

    // 4. Create the booking holding the FULL required deposit, then settle it
    //    atomically against the gift card's real, locked balance.
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        customer_id: customerId,
        guest_name: input.guest_name,
        guest_contact: input.guest_contact,
        service_id: service.id,
        requested_date: input.requested_date,
        time_window: input.time_window,
        zone: input.zone,
        notes: input.notes,
        status: "pending_payment",
        amount_cents: serviceCents,
        addons_cents: addonsCents,
        addons,
        bedrooms,
        bathrooms,
        half_bathrooms: halfBathrooms,
        deposit_cents: service.deposit_cents,
        first_booking_discount_applied: firstBooking,
        gift_card_id: giftCard?.id ?? null,
        gift_card_planned_cents: giftPlanned,
        idempotency_key: input.idempotency_key,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      // Two simultaneous requests with the same key: the loser replays the winner.
      if (bookingError?.code === "23505" && input.idempotency_key) {
        const { data: winner } = await supabase
          .from("bookings").select("*").eq("idempotency_key", input.idempotency_key).maybeSingle();
        if (winner) return await replay(winner);
      }
      throw new Error(bookingError?.message ?? "Could not create booking.");
    }
    createdBookingId = booking.id;

    const { data: reservedRows, error: reserveError } = await supabase.rpc("reserve_booking_deposit", {
      p_booking: booking.id,
      p_card: giftCard?.id ?? null,
      p_planned: giftPlanned,
      p_deposit: service.deposit_cents,
      p_min_charge: STRIPE_MIN_CHARGE_CENTS,
    });
    const reserved = Array.isArray(reservedRows) ? reservedRows[0] : null;
    if (reserveError || !reserved) throw new Error(reserveError?.message ?? "Could not reserve the deposit.");
    const applied: number = reserved.applied_cents;
    const onlineDue: number = reserved.online_due_cents;

    // 5a. The gift card really covers everything due today: confirmed already
    //     (done inside the same transaction), just notify.
    if (reserved.confirmed) {
      createdBookingId = null;
      const remaining = ((totalCents - applied) / 100).toFixed(2);
      await sendEmail(
        OWNER_EMAIL,
        `Booking confirmed (gift card): ${input.guest_name}`,
        [
          `Booking confirmed for ${input.guest_name}`,
          `Service: ${service.name}`,
          `Date: ${input.requested_date} (${input.time_window})`,
          `Area: ${input.zone || "Not specified"}`,
          `Home: ${sizeLine(bedrooms, bathrooms, halfBathrooms)}`,
          ...(addons.length ? ["Extras:", ...addonsEmailLines(addons)] : []),
          `Total price: $${(totalCents / 100).toFixed(2)} CAD`,
          `Gift card ${giftCard?.code ?? ""}: -$${(applied / 100).toFixed(2)} CAD`,
          `Due at appointment: $${remaining} CAD`,
          `Contact: ${input.guest_contact}`,
          `Notes: ${input.notes || "(none)"}`,
        ].join("\n"),
      );
      if (isEmail(input.guest_contact)) {
        await sendEmail(
          input.guest_contact,
          "Your Magicstick Clean booking is confirmed",
          `Hi ${input.guest_name},\n\nYour booking is confirmed for ${input.requested_date} (${input.time_window}). Your gift card covered $${(applied / 100).toFixed(2)}${Number(remaining) > 0 ? ` — the remaining $${remaining} is due at the appointment` : " — nothing more is due"}.\n\nQuestions? Call or text 343-843-7761.\n\n— The Magicstick Clean team`,
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

    // 5b. Something is still due online (the card covers none, part, or no
    //     longer enough): charge exactly that.
    if (!stripe) throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
    const paymentIntent = await stripe.paymentIntents.create({
      amount: onlineDue,
      currency: "cad",
      automatic_payment_methods: { enabled: true },
      description: `${service.name} — booking deposit (${input.requested_date}, ${input.time_window})`,
      metadata: { kind: "booking", booking_id: booking.id },
      receipt_email: isEmail(input.guest_contact) ? input.guest_contact : undefined,
    }, { idempotencyKey: `booking-${booking.id}` });

    const { error: linkError } = await supabase
      .from("bookings")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", booking.id);
    // The webhook finds the booking through the PaymentIntent's metadata, so a
    // failed link is logged, not fatal.
    if (linkError) console.error("could not store the PaymentIntent id:", booking.id, linkError);
    createdBookingId = null;

    return json({
      client_secret: paymentIntent.client_secret,
      booking_id: booking.id,
      amount_cents: serviceCents,
      addons_cents: addonsCents,
      deposit_cents: onlineDue,
      gift_card_planned_cents: applied,
      first_booking_discount_applied: firstBooking,
    });
  } catch (err) {
    // Full detail stays in the server log; the visitor gets a generic code.
    console.error(err);
    if (createdBookingId) await abandonNow(createdBookingId);
    return json({ error: "server_error" }, 500);
  }
});
