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
   `admin_users` tables with row-level security already wired up, and seeds
   the three bookable services (Standard, Deep, Airbnb Turnover) with their
   prices and deposits.

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
3. Set the function secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set OWNER_EMAIL=magicstickclean@gmail.com
   supabase secrets set OWNER_NOTIFY_FROM=quotes@yourdomain.com
   ```
4. Deploy the notification function:
   ```bash
   supabase functions deploy notify-quote-request --no-verify-jwt
   ```
5. Wire it to fire on new quote requests — **Dashboard → Database → Webhooks
   → Create a new webhook**:
   - Table: `quote_requests`, Events: `INSERT`
   - Type: Supabase Edge Function → `notify-quote-request`

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

## 5. Point the site at your backend

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

## 6. Deploy the static site

Any static host works — GitHub Pages, Netlify, Vercel. Just make sure
`SITE_URL` (step 4) and Supabase's `additional_redirect_urls`
(`supabase/config.toml`) match wherever you actually deploy it.

## What each piece does

| Page | What it needs |
|---|---|
| `index.html` — quote form | Supabase only (saves to `quote_requests`, emails via `notify-quote-request`) |
| `booking.html` — online booking | Supabase + Stripe (creates a `bookings` row, redirects to Stripe Checkout for the deposit) |
| `account.html` — customer accounts | Supabase Auth (sign up/log in, see your own bookings) |
| `admin.html` — owner dashboard | Supabase Auth + `admin_users` (see and update all quote requests and bookings) |

## Not included (yet)

This backend covers quote capture, online booking with a deposit, customer
accounts, and an owner dashboard — the four things asked for. It does **not**
include: collecting the remaining balance after the deposit, calendar
availability/conflict checking (you're trusted to not double-book a
requested slot), SMS reminders, or recurring-booking automation. Ask if you
want any of those built next.
