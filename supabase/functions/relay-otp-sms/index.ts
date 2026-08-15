// Supabase Auth "Send SMS" Hook. Configured in place of a real SMS
// provider (Twilio/etc.) so that phone-login OTP codes -- which are still
// generated and verified entirely by Supabase Auth -- get queued for a
// staff member to relay to the customer over WhatsApp instead of being
// sent by an SMS gateway. See docs/SETUP.md for why, and for the
// alternative (a real SMS provider) once one is set up.
//
// Required secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-provided on Supabase)
//   SEND_SMS_HOOK_SECRET  -- the same secret configured on the Auth Hook
//                            (format: v1,whsec_...)

import { createClient } from "npm:@supabase/supabase-js@2";
import { Webhook } from "npm:standardwebhooks@1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "";
const wh = new Webhook(hookSecret.replace("v1,", ""));

Deno.serve(async (req) => {
  const body = await req.text();

  try {
    const headers = {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
    };
    wh.verify(body, headers);
  } catch (err) {
    console.error("hook signature verification failed", err);
    return new Response(JSON.stringify({ error: { message: "invalid signature" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = JSON.parse(body);
  const phone: string | undefined = payload?.user?.phone;
  const code: string | undefined = payload?.sms?.otp;

  if (!phone || !code) {
    return new Response(JSON.stringify({ error: { message: "missing phone or otp" } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await supabase.from("otp_relay_queue").insert({ phone, code });
  if (error) {
    console.error("failed to queue otp", error);
    return new Response(JSON.stringify({ error: { message: "failed to queue otp" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
});
