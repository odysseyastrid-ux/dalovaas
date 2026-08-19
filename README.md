# Chez Sanji + Dalovaas

This repo holds two apps that share one Supabase project:

- **Chez Sanji** (`apps/web`) — a fast-food ordering app (customer PWA +
  staff dashboard) for a single restaurant.
- **Dalovaas** (`apps/marketplace`) — a multi-vendor delivery marketplace
  (the "Uber Eats for Cameroon" layer): any restaurant can join as a
  vendor, independent couriers pick up and deliver, the platform takes a
  commission. See **[apps/marketplace/README.md](apps/marketplace/README.md)**
  for the full breakdown of its four roles (customer, vendor, courier,
  admin) and how to run it.

The rest of this README covers Chez Sanji specifically.

## Chez Sanji

A fast-food ordering app (customer PWA + staff dashboard) for Chez Sanji,
built from the original design prototype (`Chez Sanj App.dc.html` /
`Chez Sanji Dashboard.dc.html`, see `docs/design-handoff/`) with a real
shared Supabase backend in place of the prototype's per-device
`localStorage`.

## Why this exists

The prototype faked "real-time" with `localStorage` + a `storage` event
listener — two different devices never saw each other's data. A customer
order placed on a phone never reached the kitchen's device unless they
happened to share a browser. This repo replaces that with an actual
backend: Postgres tables, row-level security, and realtime subscriptions,
so the customer app, the kitchen phone, and the counter tablet all see the
same live orders.

## Structure

```
apps/web/               Chez Sanji — React + TypeScript + Tailwind frontend
  src/customer/          Customer-facing app (splash, login, menu, cart, checkout, tracking, account)
  src/staff/              Staff dashboard (orders board, menu manager, reports, team)
  src/hooks/               Realtime data hooks (Supabase Postgres Changes)
  src/state/               Cart / auth / toast stores (zustand)
apps/marketplace/       Dalovaas — multi-vendor delivery marketplace (own README)
  src/customer/            Browse vendors, order, track delivery
  src/vendor/               Restaurant partner dashboard (menu, incoming orders)
  src/courier/              Courier app (available deliveries, claim, deliver)
  src/admin/                Platform back-office (approve vendors, GMV/commission)
supabase/
  migrations/              Schema, RLS policies, SECURITY DEFINER RPCs
                           (0001-0028 Chez Sanji, 0029-0030 Dalovaas — mk_* tables/functions)
  functions/                Edge Functions (WhatsApp + push notifications, cron, staff invites)
  seed.sql                  Menu / rewards / promo code seed data (ported from the prototype)
docs/
  SETUP.md                  Full provisioning + deploy guide — start here
  design-handoff/            Original design prototype + backend handoff brief, for reference
```

## Quick start

See **[docs/SETUP.md](docs/SETUP.md)** for the full walkthrough (provision
Supabase, seed data, deploy Edge Functions, configure OTP/WhatsApp/push,
run the frontend). Short version:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
psql "$(supabase db url)" -f supabase/seed.sql

cd apps/web
cp .env.example .env   # fill in your Supabase URL + anon key
npm install
npm run dev
```

## What changed from the prototype

Every item in the original handoff brief's migration checklist is
implemented:

- **Orders** are created, validated, advanced, and delivered through
  `SECURITY DEFINER` Postgres functions — the client never sets `ref`,
  `pickup_code`, prices, `pending_validation`, `order_status_index`, or
  `step_deadline` directly. Prices are always re-resolved from
  `menu_items` server-side, so a tampered client price is ignored.
- **Realtime**: the tracking screen, staff orders board, and menu all use
  Supabase Realtime (Postgres Changes) instead of polling/`storage` events.
- **The 7-minute "Preparing" countdown** advances via a server-side cron
  (`pg_cron` or a Scheduled Edge Function), not a client `setInterval` that
  stops the moment a tab closes.
- **Customer auth** is real phone OTP (Supabase Phone Auth + your SMS
  provider of choice), not a WhatsApp deep link showing the code in the UI.
- **Staff auth** is real per-person accounts with `cashier`/`manager`
  roles, not a shared password baked into the client.
- **Payment proofs** upload to a private Supabase Storage bucket,
  RLS-scoped to the uploading customer + staff.
- **Menu management** is a single `menu_items` table (with a
  `deleted`/`out_of_stock` flag) instead of the prototype's separate
  override/exclusion maps.
- **WhatsApp + push notifications** are real integrations (WhatsApp
  Business Cloud API + Web Push), fired from an `event_outbox` table via a
  Database Webhook — see `supabase/functions/notify-order-event`.

## Status

The schema, RLS, RPCs, Edge Functions, and Database Webhook have been
deployed against a real Supabase project and verified end-to-end via the
same API calls the frontend makes: phone OTP login → `create_order` (price
recomputed server-side, loyalty points credited) → `event_outbox` →
`notify-order-event` fired and processed → staff `validate_order_payment`
(sets a real 7-minute `step_deadline`) → the status-advance cron flips
Preparing→Ready → `mark_order_delivered`. A manager account was bootstrapped
for the staff dashboard.

The frontend covers the full customer flow (login → browse → cart →
checkout → live tracking → loyalty → account) and staff flow (login → live
orders board → validate/deliver → menu management → CSV export → staff
invites). It's deployed and live on Vercel, with Web Push (VAPID) keys
generated and wired end-to-end (subscribe on the client, deliver from
`notify-order-event`).

**What's still needed before real customers use it:** a live SMS/OTP
provider — phone login currently runs on a Test OTP number
(`699000001` / code `123456`) for demos, see docs/SETUP.md — and, if
wanted, a WhatsApp Business Cloud API token (skipped for now; nothing else
depends on it) and real product photos.
