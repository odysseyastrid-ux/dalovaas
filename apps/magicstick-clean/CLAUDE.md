# Magicstick Clean — project context for Claude / Cowork

This file is read automatically at the start of any Claude Code / Cowork session
working in `apps/magicstick-clean/`. It is the single source of truth for who this
business is, what the site does, and the current live state — so any assistant
(marketing help, copywriting, coding) starts fully informed. Keep it up to date.

> **Maintenance agents:** also read `AGENTS.md` (how to change, test and deploy safely).
> The owner's plain-French guide is `GUIDE-PROPRIETAIRE.md`.

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
- **A clear, personalized price** sent before any commitment (free quote, same-day reply).
- **Same-day reply** promise (a real operating commitment).
- **Personal & direct** (phone/text/email answered by the operator), vs. corporate
  franchises. The whole competitive story is: consistent, personal, trustworthy.

---

## Services & pricing — INTERNAL ONLY (prices are not on the site)

> **Owner's decision, Nov 4, 2026: no price is shown anywhere on the site** (pages, JSON-LD,
> Louis the chatbot). Every client gets a personalized quote, then pays with a link
> (`pay.html`). The table below is the owner's old internal reference; on Nov 4 the owner also
> said the minimum should be **$39.50/h** to stay profitable. Never publish these numbers;
> ask the owner before using them anywhere (e.g. drafting a quote).

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
- **First cleaning: 20% off** (owner's offer, Nov 4, 2026), one per household (same address,
  phone or email). Applied by `quote-pay` on `book.html` (skipped if that phone/email already
  paid a quote) and pre-filled at 20% in the dashboard calculator for new clients. Promoted by a
  dismissible bar on every page (`initPromoBar` in site-enhancements.js), the area popup
  (`js/zone-popup.js`, quote + booking pages) and Louis (via `ai_knowledge` row `client`).
  Honest conversion only: trust strip (same-day reply, free re-clean guarantee, eco supplies,
  secure payment, local) + the real Google review; never fake urgency, counts or reviews.
- **Lead capture** (Nov 2026): the area popup's step 3 asks for a name + email or phone with a
  required, unticked consent box (CASL). `submit-form` form `lead` saves it in
  `newsletter_subscribers` (`source = 'popup'`, `consent_at`, `consent_version`
  `popup-optin-v1`, migration 0025), emails the owner ("Nouveau prospect") and the visitor (20%
  offer). Dashboard → **Prospects** lists them with CSV export. Offers go only to rows with a
  consent date (or newsletter sign-ups) and not unsubscribed.
- The payment page is called **"Pay my order / Payer ma commande"**; the pay code is shown to
  clients as their **order number**.
- **Nothing is paid online right now** (`ONLINE_PAYMENTS: false`): the client pays at
  the appointment. The deposit amounts stay in the DB for when Stripe is switched on
  (Standard/Commercial/Windows $30, Airbnb $25, Deep/Post/Move $50) but the site does
  not mention or collect them.
- All prices are shown in **CAD**.
- Optional add-ons exist (`service_addons` table) and are collected at the
  appointment, on top of the total.

---

## How visitors convert (the funnel)

1. **Free quote** (`quote.html`) — name, phone and/or email, address or area, zone,
   service, approximate size (sq ft range), preferred day, message (+ optional photos).
   `submit-quote` saves it to `quote_requests` **and emails the owner itself** (French),
   plus a confirmation to the client when they gave an email (sender
   noreply@magicstickclean.ca). `owner_notified_at` records that the owner's email went
   out. (The Database Webhook to `notify-quote-request` was never configured — that
   function is unused.) If the backend can't be reached, the page says so plainly and
   offers a prefilled email / a call: it never shows "received" when nothing arrived.
2. **Personalized price + payment link** — the owner opens the quote in `admin.html`, clicks
   **Envoyer le prix / Send the price**, types the price (and what's included). That writes
   `quoted_amount_cents` + a random 10-character `pay_code` (migration 0023) and prepares a
   ready FR/EN message (SMS / email / copy) with the link `pay.html?code=…`.
   The same dialog has an internal **price calculator**: rate from the `services` table
   (`base_price_cents` / `duration_minutes`, editable in the Services tab, floor $39.50/h,
   migration 0024; outdoor lawn/snow is a fixed $50/h in `admin.js`), suggested hours from the
   home size or rooms (owner adjusts), discount %, extras, taxes % (remembered on the device).
   "Use this price" fills the price, saves it and prepares the message.
3. **Pay** (`pay.html`, function `quote-pay`) — the client sees their price (always read from
   the database) and pays by **Interac e-Transfer** to magicstickclean@gmail.com with the code
   as message, or on the day; the owner then clicks **Mark as paid**. **Card** (Stripe Payment
   Element) appears only when `ONLINE_PAYMENTS: true` in `js/config.js` **and** the Supabase
   secret `QUOTE_CARD_PAYMENTS=on`; `stripe-webhook` then marks the quote paid
   (`metadata.kind = "quote"`) and emails owner + client.
   **Standard Cleaning only** can be booked and paid directly on `book.html` (owner's decision,
   Nov 4): day, time window, 3–8 h, price = rate × hours computed by `quote-pay`
   (`book_standard`), then pay.html. Card is ON (Stripe activated by the owner); the dashboard
   can email the pay link itself (`send_link`). Card payments are marked paid by `stripe-webhook`
   (deployed Nov 16, 2026 with the owner's OK), which then calls `automations` for the receipt.
      `booking.html` and the homepage price estimator were **removed** (`/booking` redirects to
   the quote form). The homepage now explains the 3 steps (quote → price → pay).
4. **Customer accounts** (`account.html`) — sign up / log in, see own bookings.
5. **Owner/admin dashboard** (`admin.html`, rebuilt Nov 16, 2026 — real data only, all demo
   modules and the contest section removed). 7 sections: **Home** (animated KPIs, "To do"
   list, Chart.js charts: revenue/week, request→paid funnel, services, zones, request hours,
   requests+leads/week), **Orders** (one card per quote_request, pipeline derived in
   `stageOf()`: new → priced → paid → planned (`scheduled_date`/`scheduled_window`, migration
   0028) → done (`completed_at`) / cancelled (`status = declined`)), **Clients & leads**,
   **Gift cards**, **Team & applicants** (job_applications), **Settings** (services, extras,
   Louis knowledge), **AI assistant**. Phone: bottom tab bar; PC: sidebar. Legacy `bookings`
   rows (old booking.html, none paid) are no longer shown. **Step 2 (live, Nov 16, 2026):**
   - `automations` edge function (pg_cron every 15 min + pinged after dashboard actions and by
     stripe-webhook; public, idempotent, rate limited): payment receipt, employee job sheet (on
     assignment / reassignment), day-before reminder from `scheduled_date` (client + employee,
     from 9 a.m. Eastern), thank-you + Google review link 2 h after "done" (9 a.m.–8 p.m.), one
     unpaid reminder 3 days after the price. Each email is claimed via its stamp column
     (`receipt_sent_at`, `job_sheet_employee_id`, `reminder_sent_at`, `thanks_sent_at`,
     `unpaid_reminder_at`, migration 0030); rows existing before 0030 were stamped as handled.
   - `employees` table (Team section) + `quote_requests.assigned_employee_id`; employees get
     emails only, never dashboard access.
   - `page_views`: anonymous first-party visit counter (`countVisit` in site-enhancements.js;
     no IP/cookie, per-tab random id, skipped when optional cookies are refused; disclosed in
     privacy.cookies.p1). Home shows visitors/day, pages, sources, devices, hours, time zones.
   - Site care section (migration 0029): health checks, top-bar message (`site_settings`),
     supplies inventory, JSON/CSV backup, tool links.
   **Partner agencies (Nov 23, 2026, migration 0031):** `partners` table (rate, deposit %, days
   to pay the balance; managed in Clients). The owner creates a partner job from Orders ("New
   partner order": date, address, estimated hours, deposit % per job). Owner's rule: partners
   pay the deposit (50% by default) BEFORE the job starts. `automations` then sends: booking
   confirmation (every order, on date set/changed, `confirmation_date`), deposit reminder 2 days
   before, owner alert the day before if the deposit is missing, deposit receipt, invoice from
   the actual hours entered at "Done" (3-hour minimum, minus the deposit) and one balance
   reminder after the terms. pay.html shows partners what is due now (Interac only, no card).
   Partner orders never get the unpaid-price reminder or the Google review request.
   **Prospecting (Nov 23, 2026, migration 0033):** `prospects` table (33 businesses found on the
   web: cleaning agencies, Airbnb managers, property managers, realtors, contractors, job
   channels; Care n Tidy marked client). Dashboard → Clients → Prospection: "Today" list (due
   follow-ups first, then new ones, 10 max), call/website/intro-email links (the intro email
   opens in the owner's own mailbox, with a "no thanks" opt-out line), buttons Contacted (+5 days),
   Interested (+2), Later (+7), Not interested, "They said yes → client" (pre-fills the partner
   form). `automations` emails the OWNER a daily "À contacter aujourd'hui" list from 8 a.m.
   (claimed in `automation_log`). Nothing is ever sent to prospects automatically (CASL).
   Prospect category `request` (migration 0034): public "looking for a cleaner" posts (link +
   summary only, no personal data) with a personal reply in `reply_text` (0035).
   **Growth tab (Croissance, migration 0035):** sign-up checklist (TaskRabbit, HomeStars, Bark:
   the owner creates these accounts; never create accounts or handle passwords for them),
   profile texts EN/FR, Facebook post for the Rockland groups, and the public requests with
   their reply + copy/contacted buttons. Ticks are stored in `growth_checklist`.
   **Bulle, the owner's AI employee (Nov 23, 2026, migration 0036):** `owner-agent` edge function +
   `js/admin-agent.js` (an original animated soap-bubble creature, floating button + drawer on every tab).
   Fully separate from Louis (`ai-chat`, public site only; Louis and the cookie banner/promo bar are not
   loaded on admin.html). Knows the site and the live back office (no client phone/email/address is sent
   to the model), searches the web (Groq `browser_search`), skills: marketing, sales, call center,
   cleaning, evaluation. It only PROPOSES actions (price window pre-filled, schedule, paid/done, prospect
   status, growth tick, pause/intro of an automatic email, ready SMS/email); each runs only when the owner
   clicks Confirm. `automation_settings` (pause per email kind + intro FR/EN) is read by `automations`;
   `agent_messages` keeps the conversation.
   **Effects & sounds settings (Settings → Effets et sons):** game mode, sounds, volume, touch effects,
   win celebrations, level-up screen, 3D cards, vibrations; saved per device (`magicstick_admin_fx`).
   Migration 0037 replaces the old public requests with November 2026 posts (Facebook groups, Reddit),
   signs ready replies "the Magicstick Clean team" (owner's decision: never "Louis" in outreach; Louis stays the
   public chatbot name) and appends the marketing plan to `ai_knowledge` id `owner` so Bulle follows it.
   **Marketing plan (Nov 23, 2026 → end of Feb 2027): `STRATEGIE-MARKETING.md`** — 0 clients at start, goal 10+
   recurring, <$100/month, 3–5 h/week; the owner never shows her face (videos of hands/work only).
   **Mon plan (Home, migration 0038, `js/admin-plan.js`):** the plan as ~30 small tasks (5–30 min, precise steps)
   in `plan_tasks`, shown ONE at a time (1–3 per day, `plan_settings.per_day`); buttons Done (recurring tasks come
   back after `repeat_days`), Tomorrow, Later (3 days / 1 week / date), Not for me, a focus timer, and Pause until a
   date (also pauses the `prospects` owner email, restored on resume). The owner studies, works and has ADHD: never
   show tasks as "late", never guilt; keep tasks short and precise.
   **Next (owner's decision, Nov 23, 2026): `PLAN-CONNEXIONS.md`** — connect Gmail (by forwarding, not the
   API), Google Business Profile, GA4 + Search Console + Calendar (service account), Facebook/Instagram; plus
   morning summary, review alerts, expenses & profit, PDF receipts. Bulle prepares, the owner confirms.
   Google setup waits until after the owner's exams; Phase 0 (no Google needed) can be built first.

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
- **Edge functions (Deno):** submit-quote (quotes + booking requests + emails),
  submit-form (newsletter, gift-card requests, jobs, contest), ai-chat, owner-assistant,
  send-auth-email, create-payment-intent / stripe-webhook / gift-cards (payments, idle
  while `ONLINE_PAYMENTS` is false), sync-to-twenty (optional CRM), notify-quote-request
  (unused). Full table and deploy procedure: `AGENTS.md`.
- **Payments:** Stripe keys exist (`pk_live` in `js/config.js`; `sk_live` + webhook
  secret in Supabase secrets) but the account was never activated and payments are
  **switched off** on the site (`ONLINE_PAYMENTS: false`). Stripe uses the Deno build
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
- Generic booking deposits stay off (`ONLINE_PAYMENTS: false`). Card payments that ARE on:
  quotes on `pay.html` and standard cleaning on `book.html` (via `quote-pay`), and **gift
  cards** on `gift-cards.html` (`GIFT_CARD_PAYMENTS: true` in `js/config.js`, Nov 16, 2026).
  After Stripe accepts a gift card payment the page calls `gift-cards` action `confirm`, which
  re-reads the PaymentIntent from Stripe, activates the card and sends the refined HTML email
  (`giftCardHtml`) exactly once (`delivered_at` claim, migration 0026); the webhook is a backup.
- **Admin two-step sign-in** (Nov 16, 2026): `admin.html` requires an authenticator-app code
  (Supabase TOTP MFA). Migration 0027 adds a RESTRICTIVE policy on `admin_users` (aal2 only),
  which closes every admin RLS policy to password-only sessions; `gift-cards`, `quote-pay`
  and `owner-assistant` check the JWT `aal` claim too (`passedTwoStep`). Lost phone: delete the
  owner's row in `auth.mfa_factors`; they re-enroll at next sign-in.
- **Crawlers:** `robots.txt` names the AI/search bots and allows them (not admin/account/pay
  links); `llms.txt` summarizes services and areas for AI assistants; IndexNow key file at
  the root (`8b111f2252ce504abd513eeafb86facb.txt`) for Bing/Yandex pings. No keyword
  stuffing: it violates Google's spam policies and gets sites demoted.

---

## Contest "50 free cleanings to win" (tirage-50-2026) — CANCELLED (Nov 23, 2026)

Closed early on Nov 3, 2026, then **cancelled by the owner on Nov 23, 2026**: no draw, the
contest page (`concours.html`, `js/concours.js`) and the contest print files were deleted,
`/concours`, `/contest`, `/concours.html` and the old `utm_campaign=tirage-50` QR now
redirect to the homepage, and the owner asked for the 3 entries in `contest_entries` to be
deleted (they were told twice that the published rules had no cancellation clause and that
the entrants would not receive the promised prize). `submit-form` still refuses entries (410).
Never promote or relaunch this contest.

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
- **Core promises to lead with:** free personalized quote · same-day reply · local &
  bilingual · easy payment by link after the quote. **Never publish a price.**
- **Proof on hand:** real before/after photography already in `assets/images/`
  (hardwood, bathroom, fridge before/after pairs; dishwashing, baseboards, office,
  post-construction, move-in/out, Airbnb turnover, retail, pet-hair; a hero family
  photo and a hero proof video). Use these — do not invent new "proof."
- **Honest levers available:** regular visits (weekly/biweekly/monthly, priced in the quote),
  gift cards (`gift-cards.html`, paid by card, emailed automatically), bilingual
  service, local/hyper-local SEO (dedicated Ottawa / Gatineau / Clarence-Rockland
  location pages already exist).
- **Not yet available (don't promise):** no calendar/availability conflict checking,
  no SMS reminders, no automated balance collection after deposit, no recurring-
  booking automation. Live card payments pending Stripe activation.
