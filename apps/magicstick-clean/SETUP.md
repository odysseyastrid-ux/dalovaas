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

Booking deposits are collected with an **embedded** Stripe payment form
(Stripe Elements) right on `booking.html` — no redirect to a Stripe-hosted
page. The booking form's "Continue to payment" step creates a Stripe
PaymentIntent (`create-payment-intent` function) and mounts Stripe's own
secure card fields in place.

1. Create a [Stripe](https://dashboard.stripe.com/register) account (test
   mode is fine to start).
2. Grab both keys from **Developers → API keys**: the **secret key**
   (`sk_...`, keep private) and the **publishable key** (`pk_...`, safe to
   put in client-side code).
3. Set the **publishable** key in `js/config.js`:
   ```js
   STRIPE_PUBLISHABLE_KEY: "pk_test_xxx",
   ```
4. Set the **secret** key as a function secret:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
   ```
5. Deploy the payment function:
   ```bash
   supabase functions deploy create-payment-intent --no-verify-jwt
   ```
6. Deploy the webhook function, then register its URL in Stripe:
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
   In the Stripe dashboard: **Developers → Webhooks → Add endpoint** →
   `https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook`,
   listening for `payment_intent.succeeded`. Stripe gives you a **signing
   secret** (`whsec_...`) — set it too:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```
7. When you're ready to take real payments, switch Stripe out of test mode
   and swap in your live secret/publishable keys + a live webhook
   endpoint/secret.

### First-booking discount

Services are priced on a real hourly rate: **$43.50/h** regular,
**$37/h** (~15% off) automatically applied to a customer's very first
booking. Eligibility is decided server-side in `create-payment-intent`
(no prior `bookings` row for that signed-in account — guests are treated
as first-time by default) and can't be spoofed from the browser. Adjust
the two rates in `supabase/migrations/0007_hourly_pricing_first_booking_discount.sql`
if they ever change, then re-run the `update services set ...` statement
against the live project.

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
that's the scary unbranded email new users see. Editing those templates
directly in the dashboard requires a paid Pro plan (unless you connect
custom SMTP) — so instead, a Supabase Edge Function
(`supabase/functions/send-auth-email`) takes over sending these emails
itself, via the same Resend account already used for quote-request
notifications (step 3), fully branded and free.

1. If you haven't already (step 3), set the Resend secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set OWNER_NOTIFY_FROM=quotes@yourdomain.com
   ```
2. Deploy the function:
   ```bash
   supabase functions deploy send-auth-email --no-verify-jwt
   ```
   Note the function's URL (`https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-auth-email`).
3. In the Supabase dashboard: **Authentication → Hooks → Send Email hook
   → Enable**. Choose **HTTPS**, paste the function URL, then click
   **Generate Secret** — copy the value it gives you (looks like
   `v1,whsec_...`).
4. Set that as a secret too:
   ```bash
   supabase secrets set SEND_EMAIL_HOOK_SECRET="v1,whsec_xxx"
   ```
5. Save the hook. From now on every auth email (login code, signup
   confirmation, password reset) is sent by this function with the
   Magicstick Clean logo/colors instead of the generic Supabase look —
   the dashboard's own email templates are no longer used at all once
   this hook is enabled.

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
