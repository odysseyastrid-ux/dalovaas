// Called by booking.html when a visitor submits the booking form. Creates
// a `bookings` row (status = pending_payment) and a Stripe Checkout session
// for the deposit, then returns the Checkout URL for the client to redirect
// to. The booking is only marked "confirmed" later, by the stripe-webhook
// function, once Stripe confirms the payment actually went through.
//
// Required secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided on Supabase)
//   STRIPE_SECRET_KEY                          (Stripe secret key, sk_...)
//   SITE_URL                                   e.g. https://magicstickclean.ca

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:8000";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!STRIPE_SECRET_KEY) {
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
        amount_cents: service.base_price_cents,
        deposit_cents: service.deposit_cents,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw new Error(bookingError?.message ?? "Could not create booking.");
    }

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("payment_method_types[0]", "card");
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "cad");
    params.set(
      "line_items[0][price_data][product_data][name]",
      `${service.name} — booking deposit (${requested_date}, ${time_window})`,
    );
    params.set("line_items[0][price_data][unit_amount]", String(service.deposit_cents));
    params.set("success_url", `${SITE_URL}/booking.html?status=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${SITE_URL}/booking.html?status=cancelled`);
    params.set("metadata[booking_id]", booking.id);
    if (isEmail(guest_contact)) {
      params.set("customer_email", guest_contact);
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      throw new Error(session?.error?.message ?? "Stripe Checkout session creation failed.");
    }

    await supabase
      .from("bookings")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", booking.id);

    return new Response(JSON.stringify({ url: session.url }), {
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
