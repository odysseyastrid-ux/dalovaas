// Stripe webhook endpoint. Configure this URL in the Stripe Dashboard
// (Developers → Webhooks) listening for `payment_intent.succeeded`
// (booking deposits and gift card purchases),
// then set STRIPE_WEBHOOK_SECRET to the signing secret Stripe gives you
// for that endpoint — see SETUP.md.
//
// Required secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-provided on Supabase)
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   RESEND_API_KEY, OWNER_EMAIL, OWNER_NOTIFY_FROM

import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

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

// Paid gift cards are activated (code generated, balance loaded) and emailed
// by the gift-cards function, so its delivery logic lives in one place.
async function activateGiftCard(giftCardId: string | undefined) {
  if (!giftCardId) {
    console.error("gift_card payment with no gift_card_id in metadata");
    return;
  }
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/gift-cards`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "deliver", gift_card_id: giftCardId }),
  });
  if (!res.ok) throw new Error(`Gift card activation failed: ${res.status} ${await res.text()}`);
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
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;

      if (intent.metadata?.kind === "gift_card") {
        await activateGiftCard(intent.metadata.gift_card_id);
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      const bookingId = intent.metadata?.booking_id;
      if (!bookingId) {
        console.error("payment_intent.succeeded with no booking_id in metadata");
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      const { data: booking, error } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          paid_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .select("*, services(name)")
        .single();

      if (error || !booking) {
        console.error("Failed to update booking:", error);
      } else {
        // Deduct the gift card now that the booking is actually paid for.
        // Idempotent per booking, so a retried webhook never deducts twice.
        let giftApplied = 0;
        let giftCode = "";
        if (booking.gift_card_id && booking.gift_card_planned_cents > 0) {
          const { data: redeemed, error: redeemError } = await supabase.rpc("redeem_gift_card", {
            p_card: booking.gift_card_id, p_booking: booking.id, p_max: booking.gift_card_planned_cents,
          });
          if (redeemError) console.error("Gift card redemption failed:", redeemError);
          giftApplied = redeemed ?? 0;
          await supabase.from("bookings").update({ gift_card_applied_cents: giftApplied }).eq("id", booking.id);
          const { data: card } = await supabase.from("gift_cards").select("code").eq("id", booking.gift_card_id).single();
          giftCode = card?.code ?? "";
        }

        const depositDollars = (booking.deposit_cents / 100).toFixed(2);
        const totalDollars = (booking.amount_cents / 100).toFixed(2);
        const remainingDollars = ((booking.amount_cents - booking.deposit_cents - giftApplied) / 100).toFixed(2);
        const discountLine = booking.first_booking_discount_applied
          ? "First-booking discount: applied ($37/h)"
          : "First-booking discount: not applied";
        const giftLines = booking.gift_card_id
          ? [
            `Gift card ${giftCode}: -$${(giftApplied / 100).toFixed(2)} CAD`,
            ...(giftApplied < booking.gift_card_planned_cents
              ? [`⚠ Gift card covered less than planned ($${(booking.gift_card_planned_cents / 100).toFixed(2)}) — collect the difference at the appointment.`]
              : []),
          ]
          : [];
        const summary = [
          `Booking confirmed for ${booking.guest_name}`,
          `Service: ${booking.services?.name ?? booking.service_id}`,
          `Date: ${booking.requested_date} (${booking.time_window})`,
          `Area: ${booking.zone || "Not specified"}`,
          `Total price: $${totalDollars} CAD`,
          `Deposit paid: $${depositDollars} CAD`,
          ...giftLines,
          `Due at appointment: $${remainingDollars} CAD`,
          discountLine,
          `Notes: ${booking.notes || "(none)"}`,
        ].join("\n");

        await sendEmail(OWNER_EMAIL, `Booking confirmed & paid: ${booking.guest_name}`, summary);
        if (isEmail(booking.guest_contact)) {
          const giftSentence = giftApplied > 0 ? ` Your gift card covered $${(giftApplied / 100).toFixed(2)}.` : "";
          await sendEmail(
            booking.guest_contact,
            "Your Magicstick Clean booking is confirmed",
            `Hi ${booking.guest_name},\n\nYour booking is confirmed for ${booking.requested_date} (${booking.time_window}). Your $${depositDollars} deposit has been received.${giftSentence} The remaining $${remainingDollars} is due at the appointment.\n\nQuestions? Call or text 343-843-7761.\n\n— The Magicstick Clean team`,
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
