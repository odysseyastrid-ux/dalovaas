# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/vanilla JS, no build step. One shared `css/styles.css` across ~24 pages, per-page `<head>` (own Google Fonts `<link>`, own JSON-LD). Backend (Supabase Postgres + Auth + Storage, Stripe, Resend) is fully coded under `supabase/` but not yet provisioned live — see Capabilities and Constraints.

## Users

Homeowners, renters, landlords/property managers, Airbnb/short-term-rental hosts, and small office/retail operators in Clarence-Rockland, Ottawa, and Gatineau (Ontario/Quebec border region) who want a cleaning done by the same person every time rather than a rotating agency crew. Visitors arrive wanting one of: a fast, no-obligation quote; online booking with a deposit; a way to manage their own bookings (customer account); or, for the owner, a private dashboard to see and manage incoming requests/bookings.

## Product Purpose

Get a homeowner or business from "I need this cleaned" to a confirmed quote or booking with as little friction as possible, in the visitor's own language (English/French toggle throughout), while making the business feel personal, trustworthy, and consistent rather than corporate. Success = a submitted quote request or completed booking.

## Positioning

Same cleaner every visit (not a rotating crew), transparent pricing shown before commitment, a same-day response promise, and a first-time-client discount. Differentiates from larger cleaning agencies/franchises on personal consistency and directness (phone/text/email answered by the person actually doing the work).

## Operating Context

- Quote flow: visitor fills a quote form (service type, frequency, home size, zone, optional photos/video) → saved to `quote_requests` (once backend is live) or falls back to a pre-filled `mailto:`/`tel:` a customer can still edit → owner is notified and replies directly (phone/text/email).
- Booking flow: visitor picks a service + date on `booking.html`, pays a deposit via Stripe Checkout (once configured), gets a `bookings` row.
- Customer accounts (`account.html`): sign up/log in, see own bookings.
- Owner/admin dashboard (`admin.html`): view and manage all quote requests and bookings; requires an `admin_users` row tied to a real Supabase Auth user.
- Bilingual EN/FR toggle persists across the whole site via `js/i18n.js` (`data-i18n`/`data-i18n-html` attributes + a `STRINGS` dict); newer SEO/service pages are currently English-only (a known, not-yet-addressed gap).
- Service area is exactly three named communities (Clarence-Rockland, Ottawa, Gatineau) — this is a real geographic constraint, not marketing copy, and shows up in the nav, footer, schema markup, and dedicated location pages.

## Capabilities and Constraints

- Backend code (Postgres schema/migrations, Storage bucket + RLS, four edge functions: quote-notify email via Resend, Stripe checkout session, Stripe webhook, Twenty CRM sync) is complete but **not provisioned** — no live Supabase/Stripe/Resend project exists yet. `js/config.js` intentionally ships blank so every backend-dependent surface gracefully falls back (quote form → prefilled mailto:, booking/account/admin → "not turned on yet" notice) instead of breaking. This is an active, in-progress task in this same session, not a design decision.
- Photo/video upload on the quote form only actually uploads once the backend is live; before that it's collected but the visitor is told to attach files themselves in the email that opens.
- No calendar/availability conflict checking, no SMS reminders, no collecting a remaining balance after a deposit, no recurring-booking automation — explicitly out of scope for now (documented in `SETUP.md`).
- Every page must keep working with zero backend configured (this is a hard constraint the existing code already honors — preserve it through any visual change).

## Brand Commitments

- Business name: **Magicstick Clean**. Do not alter.
- Existing logo mark: a teal-to-dark-teal gradient circle badge containing a white checkmark plus one small gold four-point sparkle accent (inline SVG, reused as the site favicon, header brand icon, and footer brand icon on every page). Treat this mark itself as a confirmed asset to carry through any redesign, not something to redraw from scratch — the new visual world's palette/typography wraps around it, it doesn't replace it, unless the user says otherwise.
- Contact: phone `343-843-7761`, email `magicstickclean@gmail.com` — both must stay real, working `tel:`/`mailto:` links everywhere they appear (this was a recent, explicit user request this session).
- Same-day reply promise and first-time-client discount language appear sitewide and are real operating commitments, not placeholder copy.

## Evidence on Hand

- Real before/after photography already in `assets/images/`: hardwood floor, bathroom, fridge (each as a before/after pair), plus single real work photos — dish-washing, baseboard detail, office cleaning, post-construction cleanup, move-in/move-out (two photos), Airbnb turnover, bathroom-cleaning (turnover), retail store cleaning, pet-hair-vacuum, a family-with-dog hero photo, a hero "proof" video with poster frame. No team/owner headshots or logo files beyond the inline SVG mark.
- No real customer testimonials yet — the homepage testimonials tab currently shows placeholder slots explicitly marked as such; future work must not fabricate reviews or ratings (a fabricated-review request was already explicitly declined once this session).
- No published pricing sheet beyond what's already on-page (a first-time-client percentage discount by frequency, and per-visit price ranges named on some service pages) — do not invent numbers beyond what's already written into the site.

## Product Principles

1. The site must degrade gracefully with zero backend — never let a missing Supabase/Stripe/Resend connection break a page or hide a way to reach the business.
2. Every interactive contact point (call, email, quote, book) must resolve to a real action (`tel:`/`mailto:`/real form submit), never a dead link or a mechanism the visitor has to guess at.
3. Bilingual parity matters on the core funnel (home, quote, booking, account) even where newer SEO pages haven't caught up yet.
4. The business's actual constraints (three named service areas, real contact info, real photos, no fabricated reviews/pricing) are load-bearing content, not decoration — a visual redesign must preserve them exactly, not just their general shape.
5. Consistency and personal service (same cleaner, transparent price, fast reply) is the whole competitive story — the design should reinforce trustworthy/personal, not generic-corporate, whatever visual world is chosen.

## Accessibility & Inclusion

No explicit standard was set by the user. Existing code already includes aria-labels on icon-only controls, aria-expanded on accordions, and `prefers-reduced-motion` handling in several places — preserve these patterns in any new visual work.
