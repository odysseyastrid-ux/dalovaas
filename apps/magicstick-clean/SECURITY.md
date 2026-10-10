# Security — audit follow-up (October 2026)

This records what changed after the security audit of 9 Oct 2026, how it was
verified, **the order to put it live**, and what is deliberately *not* done.
(This file is kept out of the public site by `.vercelignore`.)

## What was fixed

| Ref | Finding | Fix | Where |
|---|---|---|---|
| S01 | A booking could be confirmed with a gift card that no longer covered the deposit (two bookings read the same balance; the second got a debit of $0) | The card is locked, debited and the booking confirmed **in one transaction** (`reserve_booking_deposit`). Confirmed only if the deposit is really covered; otherwise the PaymentIntent is created for what is still due (the existing rule for a leftover under $0.50 is kept). The webhook no longer swallows database errors, confirms a booking only once, and alerts the owner if a payment arrives for a cancelled booking. | `migrations/0013`, `functions/create-payment-intent`, `functions/stripe-webhook` |
| S02 | Anyone could insert quotes straight through the API (fake files, any status), triggering emails | New `submit-quote` function: validation, forced status `new`, rate limits per visitor / per contact address / site-wide. The anonymous insert policy is removed. | `functions/submit-quote`, `migrations/0014`, `js/quote.js` |
| S03 | Anonymous uploads to `quote-uploads` with no path, quota, type or size rule | The anonymous upload policy is removed. Uploads use one short-lived **signed URL per file**, on paths chosen by the server; the bucket accepts only photo/video types up to 50 MB; the server re-checks each file (10 MB per photo) and deletes strays; a housekeeping action removes uploads that never got a quote. | `functions/submit-quote`, `migrations/0014` |
| S04 | Public chat and payment creation had no request limit; abandoned bookings piled up | Per-visitor and site-wide limits (chat 25 / 10 min and 150 / day per visitor, 800 / h site-wide; payments 12 / h per visitor, 300 / h site-wide). Abandoned `pending_payment` bookings are cancelled after 2 h (PaymentIntent cancelled, held gift-card amount returned). A retried checkout with the same `idempotency_key` returns the same booking. | `functions/ai-chat`, `functions/create-payment-intent`, `js/booking.js` |
| S05 | Limits were "count, then insert" (racy) and silently off when the database errored | One atomic counter (`rate_limit_hit`). **Every limiter now fails closed**: if the counter can't be read the request is refused (503) before anything costly happens. The visitor's address is taken from Cloudflare's `cf-connecting-ip` (verified in the project's request logs), not from the client-controlled first `x-forwarded-for` entry. | `migrations/0013`, all public functions (`guard.ts`) |
| S06 | Booking input checked only for presence | Strict schema: real date, not in the past (Toronto calendar) and within a year, allowed time windows and areas, length limits, body size cap, contact must be an email or a phone number. SQL length constraints. Public errors are generic codes; details stay in the server log. | `functions/create-payment-intent/validate.ts`, `migrations/0013` |
| S07 | npm audit: 6 packages (1 critical) in the secondary Express server | `npm audit fix` (non-breaking): `proxy-addr` 2.0.8 (the critical one), `qs` 6.16.0, `moment` 2.31.0, `express` 4.22.3. **Left as is on purpose:** `uuid` via `sequelize` — the suggested fix is a major *downgrade* of Sequelize, and the advisory concerns `uuid` v3/v5/v6 called with a buffer, which neither the app nor Sequelize does. The server was smoke-tested (seed, login, wrong password, list, create). | `server/package-lock.json` |

Deployment-checklist items from the audit:

- **`ai_knowledge`** — checked live: RLS on, the public key reads only the `client` row, never `owner`. The table and rules were not in any migration; now recorded in `migrations/0015` (safe to re-run).
- **Floating CDN version** — `supabase-js@2` is now served from `js/vendor/supabase-js-2.117.3.umd.js` (the exact version `@2` resolved to). Chart.js (admin) has an integrity hash.
- **Security headers / CSP** — `vercel.json`: `nosniff`, `X-Frame-Options: DENY`, referrer and permissions policies, and an *enforced* minimal CSP (`frame-ancestors 'none'; base-uri 'self'; object-src 'none'`). The full policy (Stripe, Supabase, Google Fonts/Maps) is sent as **`Content-Security-Policy-Report-Only`**: it produced zero violations on all 26 pages when enforced locally, but the real Stripe payment form could not be observed here, so it is staged (see "Promote the CSP").
- **Files served by the public site** — the live site was serving `CLAUDE.md`, `MARKETING.md`, `SETUP.md`, `server/`, `supabase/` (migrations and function source). `.vercelignore` now keeps them out. Check after deploying (below).

## Putting it live — in this order

Nothing below has been applied to production yet.

1. **Migration 0013** (adds functions, a table and constraints; changes no existing behaviour). Safe first.
2. **Deploy the functions** (all with `--no-verify-jwt`, as before): `create-payment-intent`, `stripe-webhook`, `gift-cards`, `submit-form`, `ai-chat`, and the new `submit-quote`. Each ships its own `guard.ts` (and `validate.ts`).
3. **Deploy the site** (Vercel) — new `quote.js` / `booking.js`, vendored supabase-js, `vercel.json`, `.vercelignore`.
4. **Check the quote form once on the live site**, with a photo (a real submission appears in the admin dashboard, with its photo link working).
5. **Only then apply migration 0014.** It removes the old anonymous insert policies; applying it before steps 2–3 would break the live quote form (the old page inserts directly).
6. Schedule the daily `purge_orphans` call (see `SETUP.md`).

Rolling back 0014 is two `create policy` statements (they are in `0001_init.sql` and `0005`).

### After deploying, verify

```bash
for p in CLAUDE.md MARKETING.md SETUP.md server/package.json supabase/migrations/0010_gift_cards.sql; do
  curl -s -o /dev/null -w "%{http_code} /$p\n" https://magicstickclean.ca/$p; done   # expect 404 for all
curl -sI https://magicstickclean.ca/ | grep -i -E "content-security|x-frame|x-content"
```

If a file still answers 200, `.vercelignore` is not applied to Git deployments on this project; tell whoever maintains the repo and add rewrites in `vercel.json` instead.

### Promote the CSP

Browse the live site (home, quote, booking **through a real test payment**, gift cards, account, admin) with the browser console open. If there are no `[Report Only] Refused to ...` lines, change the header name in `vercel.json` from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` and merge the two policies.

## Things only you can do (dashboard)

- **Auth → Passwords:** turn on *leaked password protection* (Supabase security advisor flags it as off; it may need the Pro plan).
- **Auth → Providers → Email:** `supabase/config.toml` in this repo disables email confirmation and has a placeholder redirect URL — that file is for local development only, but confirm the live project's settings, the allowed redirect URLs, and that your admin account has a strong password / 2-step protection.
- **Spending caps / alerts:** Groq (chat), Resend (email), Supabase (storage, edge invocations), Stripe (Radar rules).
- **Stripe webhook:** confirm the live endpoint listens for `payment_intent.succeeded`.

## Not done / open

- **No CAPTCHA.** The page's arithmetic question and honeypot are still only checked in the browser; the server now enforces rate limits, validation and a honeypot, which stops casual abuse and bounds the damage, but a determined script can still submit up to the limits. Recommended next step: Cloudflare Turnstile (free). It needs your Cloudflare account and a widget on the forms plus a server check — not included because it could not be tested here, and a half-wired CAPTCHA would block real customers.
- **Your local copy:** the audit read a working copy that contained `0012_webhook_idempotency.sql` and edits to the Stripe webhook. **Those are not in this repository, nor in production** (production has migrations up to 0011 plus the booking-delete policy). `stripe-webhook/index.ts` was changed here (conditional confirmation); merge it with your local edit rather than overwriting. Migration numbers 0013–0015 were chosen to leave 0012 free for yours. 0012 and `reserve_booking_deposit` do not depend on each other; the webhook's "already confirmed" check overlaps with idempotency work you may have done.
- **Stale price text.** The newsletter welcome email (`submit-form`) still says "first clean is $37/h (15% off)", and the webhook email still has a "First-booking discount ($37/h)" line, but the current pricing has no first-booking discount ($30/h; recurring $27/h). Not part of the audit, so not changed — worth fixing.
- **`uuid` advisory** in the secondary server (see S07) remains reported by `npm audit`.

## Running the tests

```bash
# Functions (Deno >= 2): validation, limits that fail closed, gift-card wiring, webhook, quotes
cd supabase/functions/tests && deno test --no-check --allow-env --allow-read --config deno.json .

# Database, against a throwaway Postgres (never your Supabase project) — includes a
# 20-way concurrency test of the gift-card race and the lock-down of anonymous writes
PGHOST=/tmp PGPORT=5544 PGUSER=postgres ./supabase/tests/run_sql_tests.sh
```

The function tests use in-memory stand-ins for Supabase and Stripe; the SQL that matters (atomic reservation, limiter, policies) is exercised for real by the second script.
