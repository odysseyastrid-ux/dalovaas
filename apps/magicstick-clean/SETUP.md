# Magicstick Clean — backend setup

The site works with **zero setup** as a static, quote-request-only site (the
form opens your email app). Follow this guide when you're ready to turn on
the real backend: saved quote requests, a private dashboard, online booking,
deposit payments, and customer accounts.

You'll need three free/pay-as-you-go accounts:

- **[Supabase](https://supabase.com)** — database, auth, and the serverless functions
- **[Resend](https://resend.com)** — sends the email notifications
- **[Stripe](https://stripe.com)** — takes the booking deposit payments

This is a separate Supabase project from the one used by the Chez Sanji app
elsewhere in this repo — don't link the two.

## 1. Create the Supabase project

1. Create a new project at [supabase.com](https://supabase.com/dashboard).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you don't have it.
3. From `apps/magicstick-clean/`, link and push the schema:
   ```bash
   cd apps/magicstick-clean
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   psql "$(supabase db url)" -f supabase/seed.sql
   ```
   This creates the `quote_requests`, `services`, `bookings`, `profiles`, and
   `admin_users` tables with row-level security already wired up, seeds
   the three bookable services (Standard, Deep, Airbnb Turnover) with their
   prices and deposits, and creates a private `quote-uploads` storage bucket
   for the photos/video visitors attach to a quote request (visitors can only
   write to it; only a logged-in admin can view what's inside, via a signed
   link in the owner dashboard). Supabase's default per-file upload limit is
   50MB — raise it under **Storage → Settings** if you want to allow longer
   videos than that.

## 2. Create your admin (owner) login

1. On the live site, go to `/account.html` and create an account with your
   own email — this becomes your owner login too.
2. In the Supabase dashboard: **Table Editor → admin_users → Insert row**,
   and paste in your new user's `id` (find it under **Authentication → Users**).
3. You can now log in at `/admin.html` with that same email/password.

## 3. Set up email notifications (Resend)

1. Create a free account at [resend.com](https://resend.com) and grab an API key.
2. (Optional but recommended) verify your own domain in Resend so emails send
   from your address instead of `onboarding@resend.dev`.
3. Generate a long random secret to lock this function down (it's deployed
   with `--no-verify-jwt` below, since Database Webhooks don't carry a
   Supabase JWT — without a secret of its own it would be a fully open,
   unauthenticated endpoint anyone could POST to and send email through your
   Resend account):
   ```bash
   openssl rand -hex 32
   ```
4. Set the function secrets (reuse the same `WEBHOOK_SHARED_SECRET` value
   for `sync-to-twenty` in step 5 of the Twenty CRM setup, if you use it):
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set OWNER_EMAIL=magicstickclean@gmail.com
   supabase secrets set OWNER_NOTIFY_FROM=quotes@yourdomain.com
   supabase secrets set WEBHOOK_SHARED_SECRET=<the random string from step 3>
   ```
5. Deploy the notification function:
   ```bash
   supabase functions deploy notify-quote-request --no-verify-jwt
   ```
6. Wire it to fire on new quote requests — **Dashboard → Database → Webhooks
   → Create a new webhook**:
   - Table: `quote_requests`, Events: `INSERT`
   - Type: Supabase Edge Function → `notify-quote-request`
   - **HTTP Headers**: add `X-Webhook-Secret` = the same value you set as
     `WEBHOOK_SHARED_SECRET` above. Without this header the function
     rejects the request with 401 — that's the point, it means the check
     is working.

## 4. Set up deposit payments (Stripe)

1. Create a [Stripe](https://dashboard.stripe.com/register) account (test
   mode is fine to start).
2. Grab your **secret key** from **Developers → API keys**.
3. Set the function secrets (`SITE_URL` is where the site is actually
   deployed, e.g. `https://magicstickclean.ca`):
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
   supabase secrets set SITE_URL=https://YOUR-DEPLOYED-SITE-URL
   ```
4. Deploy the checkout function:
   ```bash
   supabase functions deploy create-checkout-session --no-verify-jwt
   ```
5. Deploy the webhook function, then register its URL in Stripe:
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
   In the Stripe dashboard: **Developers → Webhooks → Add endpoint** →
   `https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook`,
   listening for `checkout.session.completed`. Stripe gives you a **signing
   secret** (`whsec_...`) — set it too:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```
6. When you're ready to take real payments, switch Stripe out of test mode
   and swap in your live secret key + a live webhook endpoint/secret.

## 5. Set up the AI chat widget (optional)

The "Chat with us" button (bottom-right, every page) answers visitor
questions about services, pricing, and booking using a free-tier LLM
([Groq](https://console.groq.com), no credit card required), grounded in
your real `services` table so it can't invent prices. It's a plain HTTP
call from the browser to a Supabase Edge Function.

1. Create a free API key at [console.groq.com/keys](https://console.groq.com/keys).
2. Set it as a function secret:
   ```bash
   supabase secrets set GROQ_API_KEY=gsk_xxx
   ```
3. Deploy the function:
   ```bash
   supabase functions deploy ai-chat --no-verify-jwt
   ```
   (`--no-verify-jwt` because visitors chat anonymously, same as the
   booking/checkout function — the function has its own message-length and
   history caps to keep usage bounded.)

Leaving `GROQ_API_KEY` unset just means the widget falls back to a
"call or email us" message instead of crashing. Groq's free tier (30
requests/minute, hundreds/day) comfortably covers a small business's chat
volume; if it's ever outgrown, swapping in another OpenAI-compatible
provider is a one-line change to the endpoint + model in
`supabase/functions/ai-chat/index.ts`.

## 6. Brand the login emails (recommended)

By default every email Supabase Auth sends (login code, signup
confirmation, password reset) is a plain generic "Supabase" template —
that's the scary unbranded email new users see. Replace it with the
Magicstick Clean look:

1. Go to **[Authentication → Emails → Templates](https://supabase.com/dashboard/project/_/auth/templates)**
   in your Supabase project.
2. For each of the three templates below, paste the matching HTML over
   the existing content and save.

**Magic Link** (used for the "Log in with a code" flow):

```html
<div style="background:#F3F7F6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E4E0D4;">
    <div style="background:#0B5D52;padding:24px;text-align:center;">
      <img src="https://magicstickclean.vercel.app/assets/images/favicon.svg" width="40" height="40" alt="Magicstick Clean" style="display:block;margin:0 auto 8px;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;">Magicstick Clean</span>
    </div>
    <div style="padding:32px 28px;color:#1F2937;">
      <h1 style="font-size:20px;margin:0 0 12px;">Your login code</h1>
      <p style="font-size:15px;line-height:1.6;color:#4B5563;margin:0 0 24px;">Enter this code to log in to your Magicstick Clean account:</p>
      <div style="background:#EEF8F6;border-radius:8px;padding:18px;text-align:center;margin-bottom:24px;">
        <span style="font-size:32px;font-weight:700;letter-spacing:6px;color:#0B5D52;">{{ .Token }}</span>
      </div>
      <p style="font-size:13px;color:#6B7280;margin:0;">This code expires shortly. If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div style="background:#FDFCF9;padding:16px 28px;text-align:center;border-top:1px solid #E4E0D4;">
      <p style="font-size:12px;color:#6B7280;margin:0;">Magicstick Clean &middot; (343) 843-7761 &middot; magicstickclean@gmail.com</p>
    </div>
  </div>
</div>
```

**Confirm signup:**

```html
<div style="background:#F3F7F6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E4E0D4;">
    <div style="background:#0B5D52;padding:24px;text-align:center;">
      <img src="https://magicstickclean.vercel.app/assets/images/favicon.svg" width="40" height="40" alt="Magicstick Clean" style="display:block;margin:0 auto 8px;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;">Magicstick Clean</span>
    </div>
    <div style="padding:32px 28px;color:#1F2937;text-align:center;">
      <h1 style="font-size:20px;margin:0 0 12px;">Confirm your email</h1>
      <p style="font-size:15px;line-height:1.6;color:#4B5563;margin:0 0 24px;">Welcome! Click below to confirm your Magicstick Clean account.</p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0B5D52;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:15px;">Confirm my account</a>
    </div>
    <div style="background:#FDFCF9;padding:16px 28px;text-align:center;border-top:1px solid #E4E0D4;">
      <p style="font-size:12px;color:#6B7280;margin:0;">Magicstick Clean &middot; (343) 843-7761 &middot; magicstickclean@gmail.com</p>
    </div>
  </div>
</div>
```

**Reset Password:**

```html
<div style="background:#F3F7F6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E4E0D4;">
    <div style="background:#0B5D52;padding:24px;text-align:center;">
      <img src="https://magicstickclean.vercel.app/assets/images/favicon.svg" width="40" height="40" alt="Magicstick Clean" style="display:block;margin:0 auto 8px;">
      <span style="color:#ffffff;font-size:18px;font-weight:700;">Magicstick Clean</span>
    </div>
    <div style="padding:32px 28px;color:#1F2937;text-align:center;">
      <h1 style="font-size:20px;margin:0 0 12px;">Reset your password</h1>
      <p style="font-size:15px;line-height:1.6;color:#4B5563;margin:0 0 24px;">Click below to choose a new password. If you didn't ask for this, ignore this email.</p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0B5D52;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:15px;">Set a new password</a>
    </div>
    <div style="background:#FDFCF9;padding:16px 28px;text-align:center;border-top:1px solid #E4E0D4;">
      <p style="font-size:12px;color:#6B7280;margin:0;">Magicstick Clean &middot; (343) 843-7761 &middot; magicstickclean@gmail.com</p>
    </div>
  </div>
</div>
```

3. While you're there, also set the **Sender name** (Authentication →
   Settings → SMTP, or the default sender) to `Magicstick Clean` instead
   of the default so it doesn't show up as "Supabase Auth" in the
   recipient's inbox. For full control over the sending domain (so it
   doesn't come from `@supabase.co` at all), connect a custom SMTP
   provider — Resend, which you already set up in step 3, works for this
   too.

## 7. Point the site at your backend

Edit `js/config.js`:

```js
window.MAGICSTICK_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY",       // Settings → API — safe to expose, protected by RLS
  STRIPE_PUBLISHABLE_KEY: "pk_test_xxx",            // Developers → API keys
  FUNCTIONS_URL: "https://YOUR-PROJECT-REF.supabase.co/functions/v1",
};
```

Leaving any of these blank keeps that part of the site gracefully falling
back (the quote form emails instead of saving; booking/account/admin pages
show a "not turned on yet" notice instead of crashing).

## 8. Deploy the static site

Any static host works — GitHub Pages, Netlify, Vercel. Just make sure
`SITE_URL` (step 4) and Supabase's `additional_redirect_urls`
(`supabase/config.toml`) match wherever you actually deploy it.

## 9. Sync customers to a CRM (optional)

Want every quote request and booking to also show up in a CRM automatically?
See [`twenty-crm/README.md`](twenty-crm/README.md) — it self-hosts
[Twenty](https://twenty.com) (open-source, no per-seat fee) via Docker on
your own server and wires up a Supabase function that creates/updates a
customer record on each new request.

## What each piece does

| Page | What it needs |
|---|---|
| `index.html` — quote form | Supabase only (saves to `quote_requests`, emails via `notify-quote-request`) |
| `booking.html` — online booking | Supabase + Stripe (creates a `bookings` row, redirects to Stripe Checkout for the deposit) |
| `account.html` — customer accounts | Supabase Auth (sign up/log in, see your own bookings) |
| `admin.html` — owner dashboard | Supabase Auth + `admin_users` (see and update all quote requests and bookings) |

## Note on photo/video uploads

The quote form's "Photos of your home" and "Video walkthrough" fields only
actually upload once Supabase is connected (step 1). Without a backend, a
visitor's email app can't be handed file attachments programmatically — the
form tells them to attach the files themselves in the email that opens.

## Not included (yet)

This backend covers quote capture, online booking with a deposit, customer
accounts, and an owner dashboard — the four things asked for. It does **not**
include: collecting the remaining balance after the deposit, calendar
availability/conflict checking (you're trusted to not double-book a
requested slot), SMS reminders, or recurring-booking automation. Ask if you
want any of those built next.
