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
// trusted from the client — and only changes the displayed total/remaining
// balance. The deposit charged today is always services.deposit_cents,
// discount or not.
//
// Required secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided on Supabase)
//   STRIPE_SECRET_KEY                          (Stripe secret key, sk_...)

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) : null;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  // Guests have no account history to check against, so they're treated as
  // first-time — a returning guest who never signs in can re-claim it, which
  // is an accepted trade-off for a small business without stronger identity.
  if (!customerId) return true;
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);
  return (count ?? 0) === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!stripe) {
      throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
    }

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
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("*")
      .eq("id", service_id)
      .eq("active", true)
      .single();

    if (serviceError || !service) {
      return new Response(JSON.stringify({ error: "Unknown service." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const customerId = await getCustomerId(req);
    const firstBooking = await isFirstBooking(customerId);
    const amountCents = firstBooking ? service.first_booking_price_cents : service.base_price_cents;

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
        amount_cents: amountCents,
        deposit_cents: service.deposit_cents,
        first_booking_discount_applied: firstBooking,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw new Error(bookingError?.message ?? "Could not create booking.");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: service.deposit_cents,
      currency: "cad",
      automatic_payment_methods: { enabled: true },
      description: `${service.name} — booking deposit (${requested_date}, ${time_window})`,
      metadata: { booking_id: booking.id },
      receipt_email: isEmail(guest_contact) ? guest_contact : undefined,
    });

    await supabase
      .from("bookings")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        booking_id: booking.id,
        amount_cents: amountCents,
        deposit_cents: service.deposit_cents,
        first_booking_discount_applied: firstBooking,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
