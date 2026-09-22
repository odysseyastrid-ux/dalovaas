// Supabase Auth "Send Email" hook — takes over sending every auth email
// (login code, signup confirmation, password reset) so it can be branded
// as Magicstick Clean instead of the generic Supabase template. Editing the
// dashboard's own templates requires a Pro plan once custom SMTP isn't
// configured; this hook sidesteps that entirely and reuses the Resend
// account already set up for quote-request notifications.
//
// Configure in the Supabase dashboard: Authentication -> Hooks -> "Send
// Email hook" -> HTTPS -> paste this function's URL -> Generate Secret.
//
// Required secrets (supabase secrets set ...):
//   SUPABASE_URL             (auto-provided on Supabase)
//   RESEND_API_KEY           (resend.com API key, already used elsewhere)
//   SEND_EMAIL_HOOK_SECRET   the "v1,whsec_..." value shown when you create
//                            the hook in the dashboard
//   OWNER_NOTIFY_FROM        a verified Resend sender (optional, defaults to
//                            onboarding@resend.dev)

import { Webhook } from "npm:standardwebhooks@1.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("OWNER_NOTIFY_FROM") ?? "onboarding@resend.dev";
const HOOK_SECRET = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace("v1,whsec_", "");

function shell(bodyHtml: string) {
  return `<div style="background:#F3F7F6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E4E0D4;">
    <div style="background:#0B5D52;padding:24px;text-align:center;">
      <img src="https://magicstickclean.vercel.app/assets/images/favicon.svg" width="40" height="40" alt="Magicstick Clean" style="display:block;margin:0 auto 8px;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;">Magicstick Clean</span>
    </div>
    <div style="padding:32px 28px;color:#1F2937;text-align:center;">
      ${bodyHtml}
    </div>
    <div style="background:#FDFCF9;padding:16px 28px;text-align:center;border-top:1px solid #E4E0D4;">
      <p style="font-size:12px;color:#6B7280;margin:0;">Magicstick Clean &middot; (343) 843-7761 &middot; magicstickclean@gmail.com</p>
    </div>
  </div>
</div>`;
}

function buildEmail(actionType: string, token: string, confirmationUrl: string) {
  if (actionType === "recovery") {
    return {
      subject: "Reset your Magicstick Clean password",
      html: shell(`
        <h1 style="font-size:20px;margin:0 0 12px;">Reset your password</h1>
        <p style="font-size:15px;line-height:1.6;color:#4B5563;margin:0 0 24px;">Click below to choose a new password. If you didn't ask for this, ignore this email.</p>
        <a href="${confirmationUrl}" style="display:inline-block;background:#0B5D52;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:15px;">Set a new password</a>
      `),
    };
  }
  if (actionType === "signup" || actionType === "invite" || actionType === "email_change") {
    return {
      subject: "Confirm your Magicstick Clean account",
      html: shell(`
        <h1 style="font-size:20px;margin:0 0 12px;">Confirm your email</h1>
        <p style="font-size:15px;line-height:1.6;color:#4B5563;margin:0 0 24px;">Welcome! Click below to confirm your Magicstick Clean account.</p>
        <a href="${confirmationUrl}" style="display:inline-block;background:#0B5D52;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:15px;">Confirm my account</a>
      `),
    };
  }
  // "magiclink" — the email_action_type Supabase uses for signInWithOtp,
  // which is what the site's "Log in with a code" flow triggers.
  return {
    subject: "Your Magicstick Clean login code",
    html: shell(`
      <h1 style="font-size:20px;margin:0 0 12px;">Your login code</h1>
      <p style="font-size:15px;line-height:1.6;color:#4B5563;margin:0 0 24px;">Enter this code to log in to your Magicstick Clean account:</p>
      <div style="background:#EEF8F6;border-radius:8px;padding:18px;text-align:center;margin-bottom:24px;">
        <span style="font-size:32px;font-weight:700;letter-spacing:6px;color:#0B5D52;">${token}</span>
      </div>
      <p style="font-size:13px;color:#6B7280;margin:0;">This code expires shortly. If you didn't request this, you can safely ignore this email.</p>
    `),
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);

  // Signature verification failures are the only case that should surface as
  // a 401 ("Hook requires authorization token" on the client) — every other
  // failure (missing secret, Resend error, etc.) must return 500, or Supabase
  // Auth reports the same misleading 401 message no matter the real cause.
  let verified: { user: { email: string }; email_data: { token: string; token_hash: string; redirect_to: string; email_action_type: string } };
  try {
    const wh = new Webhook(HOOK_SECRET);
    verified = wh.verify(payload, headers) as typeof verified;
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: { http_code: 401, message: String((err as Error).message ?? err) } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const { user, email_data } = verified;

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured on the server.");
    }

    const confirmationUrl = `${SUPABASE_URL}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${email_data.redirect_to}`;
    const { subject, html } = buildEmail(email_data.email_action_type, email_data.token, confirmationUrl);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: `Magicstick Clean <${FROM_EMAIL}>`, to: [user.email], subject, html }),
    });

    if (!res.ok) {
      throw new Error(`Resend error: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: String((err as Error).message ?? err) } }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
