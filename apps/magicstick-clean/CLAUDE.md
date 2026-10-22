# Magicstick Clean — project context for Claude / Cowork

This file is read automatically at the start of any Claude Code / Cowork session
working in `apps/magicstick-clean/`. It is the single source of truth for who this
business is, what the site does, and the current live state — so any assistant
(marketing help, copywriting, coding) starts fully informed. Keep it up to date.

> Monorepo note: the repository root is a **different** project (Chez Sanji, in
> `apps/web/`). Everything below is about **Magicstick Clean** only, which lives
> entirely under `apps/magicstick-clean/`.

---

## The business

- **Name:** Magicstick Clean (never alter). Residential & commercial cleaning.
- **Owner-operated:** the person answering the phone is the person doing the clean.
- **Service area (hard geographic constraint, not marketing):** Clarence-Rockland,
  Ottawa, and Gatineau (Ontario/Quebec border region).
- **Contact (must always be real, working links):** phone/text **(343) 843-7761**,
  email **magicstickclean@gmail.com**, site **magicstickclean.ca**.
- **Live site:** https://magicstickclean.ca (deployed on Vercel, production).
- **Languages:** fully bilingual **EN/FR** on the core funnel; some newer SEO pages
  are English-only (known gap).

### Positioning / what makes it different
- **Prices and answers, up front** — no call center, no rotating script.
  (**Do NOT promise "the same cleaner every visit"**: the owner intends to grow into a
  larger company with a team, so that promise was removed from the site and marketing.)
- **Transparent pricing** shown before any commitment.
- **Same-day reply** promise (a real operating commitment).
- **Personal & direct** (phone/text/email answered by the operator), vs. corporate
  franchises. The whole competitive story is: consistent, personal, trustworthy.

---

## Services & pricing (CURRENT — updated this session)

All bookings have a **3-hour minimum**. Prices below are hourly; the site shows the
3-hour starting total (e.g. Standard = $30/h → $90 to start).

| Service | Rate | 3h start | Notes |
|---|---|---|---|
| Standard Cleaning | **$30/h** | $90 | recurring-eligible |
| Deep Cleaning | **$43/h** | $129 | — |
| Airbnb / short-term turnover | **$30/h** | $90 | recurring-eligible |
| Commercial / office / retail | **$30/h** | $90 | recurring-eligible |
| Window & Glass | **$30/h → $25.50/h** | $76.50 | **permanent 15% off** |
| Post-construction | **$50/h** | $150 | — |
| Move-in / Move-out | **$50/h** | $150 | — |
| Outdoor & seasonal — lawn/yard clearing | **$50/h** | — | **15% off, quote-only** |
| Outdoor & seasonal — snow removal | **$50/h** | — | **15% off, quote-only** |

- **Recurring plans** (weekly / biweekly / monthly) on eligible services drop to
  **$27/h = 10% off**, for as long as the plan is kept.
- There is **NO first-booking / first-time discount** anymore (it was removed — do
  not reintroduce it in copy or math).
- A **refundable deposit** is collected online to book; the balance is paid at the
  appointment. Deposits: Standard/Commercial/Windows $30, Airbnb $25, Deep/Post/
  Move $50.
- Optional add-ons exist (`service_addons` table) and are collected at the
  appointment, on top of the total — the online deposit doesn't change.

---

## How visitors convert (the funnel)

1. **Free quote** (`quote.html`) — short form, no payment, same-day reply. Falls
   back to a prefilled `mailto:`/`tel:` if the backend is ever unreachable.
2. **Book online** (`booking.html`) — pick service + date/time, pay a small
   refundable deposit via Stripe, rest paid at the appointment.
3. **Instant estimator** (homepage) — live price for service × hours × frequency
   (3h min, recurring 10%), with CTAs into booking (service preselected) and quote.
4. **Customer accounts** (`account.html`) — sign up / log in, see own bookings.
5. **Owner/admin dashboard** (`admin.html`) — view/manage quotes & bookings,
   edit AI knowledge, and chat with a private business co-pilot (see AI below).

---

## Tech & architecture (brief)

- **Frontend:** static HTML/CSS/vanilla JS, **no build step**. One shared
  `css/styles.css` across ~24 pages; per-page `<head>` (own Google Fonts link +
  JSON-LD). Hosted on Vercel.
- **i18n engine:** `js/i18n.js` (`STRINGS` dict) + `js/i18n-content.js` (`c.*`),
  via `data-i18n` / `data-i18n-html` / `data-i18n-placeholder` attributes and the
  `magicstick:langchange` event. `window.MagicstickI18N` exposes
  `t / getLang / setLang / applyLang / escapeHtml`.
- **Backend:** Supabase (project `siqpcnhfpseorjuwfrop`) — Postgres + Auth +
  Storage, exposed through `window.MagicstickBackend`. Publishable key only in
  `js/config.js`.
- **Edge functions (Deno):** create-payment-intent, stripe-webhook, gift-cards,
  ai-chat, owner-assistant, notify-quote-request, submit-form, sync-to-twenty,
  send-auth-email.
- **Payments:** **Stripe LIVE mode**. `pk_live` is in `js/config.js`; `sk_live` +
  webhook secret live in Supabase secrets. Stripe uses the Deno build
  (`esm.sh/stripe@14.21.0?target=deno`) + `Stripe.createFetchHttpClient()`.

### Interaction & motion system ("fluid layer", end of `css/styles.css`)
Apple's fluid-interface principles applied site-wide; reuse these instead of ad-hoc values:
`--ease-spring`/`--dur-spring` (critically damped spring, default for everything) and
`--ease-bounce`/`--dur-bounce` (slight overshoot, only after a flick); press feedback on
`:active` (`--press-scale` .97, 100 ms); translucent header (`backdrop-filter`) with a
scroll-edge shadow (`header.is-scrolled`, set in `site-enhancements.js`); photo viewer
(`script.js`) with 1:1 swipe, momentum projection, rubber-banding, swipe-down to close and
grow-from-thumbnail; `prefers-reduced-motion` / `-transparency` / `prefers-contrast` handled
globally; size-specific heading tracking, `text-wrap: balance`, body size in `rem`.

### Security & SEO conventions (checklists of 22 Oct 2026, see `SECURITY.md`)
- **CORS allow-list:** public functions answer browsers only from `https://magicstickclean.ca`
  and `https://www.magicstickclean.ca` (`withCors()` in each `guard.ts`, all 5 copies identical);
  a browser on any other site gets **403 before any work** (`rejectForeignOrigin()`).
  Vercel previews cannot call the functions — test against production or locally.
- **Logs:** never log a provider's response body (Resend/Groq); status + error name only.
- **Session:** Supabase auth lives in `sessionStorage`, not localStorage, with an idle
  sign-out (30 min admin, 60 min elsewhere) in `js/supabaseClient.js`.
- **CSP:** no `'unsafe-inline'` for scripts. The two inline scripts (theme snippet, home splash
  gate) are allowed by hash in `vercel.json`; editing one changes its hash —
  `supabase/functions/tests/csp.test.ts` fails and prints the new value. No `onclick=` attributes.
- **Vercel:** previews and deployment URLs need a Vercel login (Standard Protection);
  `magicstickclean.vercel.app` redirects to `magicstickclean.ca`.
- **SEO:** every page keeps its own `<title>` (also in the i18n `title` keys), description,
  canonical, og/twitter tags and exactly one `<h1>` (sub-sections use `h2`); new pages go in
  `sitemap.xml`; `<img>` tags carry `width`/`height`. Backlink plan: `STRATEGIE-BACKLINKS.md`.

### Backend status (as of this session)
- Supabase is **provisioned and live**; services/pricing above are seeded in the DB.
- Stripe keys are verified working. **The one remaining blocker for live payments
  is the owner finishing Stripe account activation + enabling card payments (CAD)**
  in the Stripe dashboard — code side is ready.

---

## Contest "50 free cleanings to win" (tirage-50-2026) — LIVE

- **Page:** `concours.html` (FR/EN, short URLs `/concours` and `/contest`), entry form +
  official rules (`#reglement`). Home promo band `#concours` on `index.html`; link in every
  mobile menu and in the footers. The 4K banners' QR codes point to
  `concours.html?utm_source=banner&utm_medium=social&utm_campaign=tirage-50`; the older QR
  (`quote.html?utm_campaign=tirage-50`) is redirected there by `vercel.json`.
- **Terms:** 50 prizes, each a standard 3-hour cleaning (value $90, $4,500 total), free entry,
  Clarence-Rockland residents 18+, one entry per person/address, entries Oct 13 → Dec 31, 2026
  23:59 ET, random draw Jan 5, 2027 12 p.m. ET, skill-testing question, prize usable until
  June 30, 2027. Never change these on the site without updating the rules section too.
- **Backend:** `submit-form` form `contest` → table `contest_entries` (migration
  `0018_contest_entries.sql`; unique per normalized phone/email; refuses after the deadline
  with 410). Owner gets an email per entry; email entrants get a confirmation.
- **Dashboard:** `admin.html` → "Contest / Concours": count, search, CSV export, statuses
  (entered / winner / disqualified) and a "Draw the winners" button (crypto-random, fills up to
  50; disqualify someone and click again to draw a replacement).

## Google review requests (owner dashboard)

- **Direct review link:** https://g.page/r/CXlL7jiMiQp2EBI/review
- **Where:** `admin.html` → "Quotes, bookings & services" → Bookings tab. Each booking
  (and each quote marked *booked*) has an **Ask for review / Demander un avis** button; a
  purple box above the table lists completed cleanings whose client hasn't been asked.
  Setting a booking to *Completed* opens the window automatically.
- **The window:** FR/EN message prefilled with the client's first name and the link
  (editable), then one tap: **Text (SMS)** / **WhatsApp** (phone found in the contact),
  **Email** (email found), or **Copy**. Sending stamps `review_requested_at` (migration
  `0017_review_requests.sql`, on `bookings` and `quote_requests`) so nobody is asked twice;
  "Mark as not asked" clears it. Code: `js/admin.js` (`REVIEW_TEMPLATES`).
- **AI co-pilot:** `owner-assistant` gets the link, both templates and the live list of
  completed cleanings not yet asked (first name, service, date, channel), so the owner can
  ask "à qui dois-je demander un avis ?" and get ready messages.
- **For an external agent** (Claude/Cowork with Supabase access): clients due are
  `select guest_name, guest_contact, requested_date from bookings where status = 'completed'
  and review_requested_at is null order by requested_date desc;` — draft with the template in
  `js/admin.js`, and after the owner sends, set `review_requested_at = now()`.
- **Rules:** only after a real completed job; never offer anything in exchange (Google
  policy); one polite reminder at most; never write or suggest fake reviews.

## The two AI assistants (already built & deployed)

1. **Louis — public chat widget** (`ai-chat` edge function, Groq model
   `openai/gpt-oss-120b`). Answers website visitors from live services + pricing +
   an owner-editable knowledge row (`ai_knowledge` id `client`). Must never invent
   prices/policies/guarantees.
2. **Private owner co-pilot** (`owner-assistant` edge function, admin-only, gated by
   Supabase auth + `admin_users`). Available **inside the admin dashboard** as a
   private chat for ANY task — marketing, copywriting, pricing math, scheduling,
   drafts, strategy. It already sees live business data (services, this month's
   bookings/quotes, pending payments) + the owner's saved notes (`ai_knowledge`
   id `owner`). This is the fastest place to ask marketing questions with context.

---

## Hard rules (do not break)

- **Never fabricate** reviews, ratings, testimonials, insurance claims, certifications,
  or pricing beyond what's written here / on the site. Real Google reviews live in
  `js/reviews.js` (quoted word for word, `summary` mirrors Google's rating/count); as of
  2026-10-13 the listing has **1 review, 5.0** (Luffy M.). Shown on `index.html#avis` and
  `learn-more.html#testimonials`. To add one, copy it exactly from Google into that file.
- **Kept on purpose (owner's decision, 22 Oct 2026) — do not revert:** logins are not kept
  after the browser closes (sessionStorage), and Vercel preview URLs are not allowed to call
  the functions (CORS allow-list). Both trade convenience for security; only strengthen them.
- **Never commit secrets.** Only the Stripe *publishable* key (`pk_`) belongs in the
  repo (`js/config.js`). Secret keys (`sk_`, `whsec_`, service-role, Resend, Groq)
  are set by the owner in the Supabase/Stripe dashboards — never write them to files
  or tools.
- **Graceful degradation:** every page must keep working with zero backend
  configured — never let a missing connection break a page or hide a way to reach
  the business. All DB-sourced strings are escaped before `innerHTML`.
- **Bilingual parity** matters on the core funnel (home, quote, booking, account).
- The business's real constraints (3 named service areas, real contact info, real
  photos, real pricing) are load-bearing content, not decoration.

---

## Marketing brief (for quick, contextual advice)

- **Who to reach:** homeowners, renters, landlords/property managers, Airbnb/STR
  hosts, and small office/retail operators in Clarence-Rockland, Ottawa, Gatineau.
- **Core promises to lead with:** transparent $30/h
  pricing · same-day reply · local & bilingual · book online with a small deposit.
- **Proof on hand:** real before/after photography already in `assets/images/`
  (hardwood, bathroom, fridge before/after pairs; dishwashing, baseboards, office,
  post-construction, move-in/out, Airbnb turnover, retail, pet-hair; a hero family
  photo and a hero proof video). Use these — do not invent new "proof."
- **Honest levers available:** recurring plan savings (10% off → $27/h), the permanent
  15% off on windows & outdoor/seasonal, gift cards (`gift-cards.html`), bilingual
  service, local/hyper-local SEO (dedicated Ottawa / Gatineau / Clarence-Rockland
  location pages already exist).
- **Not yet available (don't promise):** no calendar/availability conflict checking,
  no SMS reminders, no automated balance collection after deposit, no recurring-
  booking automation. Live card payments pending Stripe activation.
