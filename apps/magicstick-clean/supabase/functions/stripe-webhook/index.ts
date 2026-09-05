// Stripe webhook endpoint. Configure this URL in the Stripe Dashboard
// (Developers → Webhooks) listening for `checkout.session.completed`,
// then set STRIPE_WEBHOOK_SECRET to the signing secret Stripe gives you
// for that endpoint — see SETUP.md.
//
// Required secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided on Supabase)
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   RESEND_API_KEY, OWNER_EMAIL, OWNER_NOTIFY_FROM

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14?target=deno";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "magicstickclean@gmail.com";
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "onboarding@resend.dev";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set — skipping email send.");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, text }),
  });
  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text());
  }
}

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature!, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook signature verification failed: ${err}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.booking_id;
      if (!bookingId) {
        console.error("checkout.session.completed with no booking_id in metadata");
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      const { data: booking, error } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        })
        .eq("id", bookingId)
        .select("*, services(name)")
        .single();

      if (error || !booking) {
        console.error("Failed to update booking:", error);
      } else {
        const depositDollars = (booking.deposit_cents / 100).toFixed(2);
        const summary = [
          `Booking confirmed for ${booking.guest_name}`,
          `Service: ${booking.services?.name ?? booking.service_id}`,
          `Date: ${booking.requested_date} (${booking.time_window})`,
          `Area: ${booking.zone || "Not specified"}`,
          `Deposit paid: $${depositDollars} CAD`,
          `Notes: ${booking.notes || "(none)"}`,
        ].join("\n");

        await sendEmail(OWNER_EMAIL, `Booking confirmed & paid: ${booking.guest_name}`, summary);
        if (isEmail(booking.guest_contact)) {
          await sendEmail(
            booking.guest_contact,
            "Your Magicstick Clean booking is confirmed",
            `Hi ${booking.guest_name},\n\nYour booking is confirmed for ${booking.requested_date} (${booking.time_window}). Your $${depositDollars} deposit has been received — the rest is due at the appointment.\n\nQuestions? Call or text 343-843-7761.\n\n— Magicstick Clean`,
          );
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
