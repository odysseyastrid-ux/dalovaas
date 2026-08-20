# Dalovaas

A multi-vendor food delivery marketplace for Cameroon — the "Uber Eats"
layer that sits alongside Chez Sanji (a single-restaurant app also in this
repo). Any restaurant can join as a vendor, independent couriers pick up and
deliver orders, and the platform takes a commission per order.

**Live:** https://dalovaas.vercel.app

This is a separate app (`apps/marketplace`) with its own frontend and its
own dedicated Supabase project (kept isolated from Chez Sanji's, by choice —
the schema itself is portable and namespaced `mk_*`, so it could just as
easily live in a shared project instead; see `supabase/migrations/0029` and
`0030`).

## Four roles, one codebase

- **Customer** (`src/customer/`) — browse vendors, order, track delivery in
  real time, rate the restaurant and courier. Signs in with phone OTP.
- **Vendor / restaurant** (`src/vendor/`) — self-serve "become a partner"
  signup, manage the menu, accept/reject incoming orders, mark them ready
  for pickup. Signs in with email/password. New vendors land as `pending`
  until an admin approves them.
- **Courier** (`src/courier/`) — self-serve signup, go online/offline, claim
  unassigned deliveries from the pool, mark them delivered. Signs in with
  phone OTP, same as customers — the driver-app-standard flow (Uber/Bolt/
  Yango all onboard by phone, never email), which also sidesteps the class
  of bug where an interrupted email signup left an orphaned auth account
  with no courier row and no way back in. Logging in with no `mk_couriers`
  row yet (fresh or interrupted signup, doesn't matter which) shows the
  same short registration form (name, vehicle, city).
- **Admin / platform back-office** (`src/admin/`) — approve or suspend
  vendors, activate/deactivate couriers, see GMV and commission revenue
  across the whole platform. No self-serve signup — bootstrap manually (see
  below).

Role is derived at login time by checking which of `mk_admins`,
`mk_vendors` (by `owner_id`), `mk_couriers`, or `mk_customers` contains the
signed-in user's id — see `src/state/authStore.ts`.

## Order lifecycle

`pending → accepted → ready_for_pickup → picked_up → delivered`
(or `cancelled` from any non-terminal state).

Every transition is a `SECURITY DEFINER` RPC (`supabase/migrations/0030_marketplace_functions.sql`)
so the client can never fabricate a status jump, tamper with prices, or
invent a commission — `mk_create_order` always re-resolves prices from
`mk_menu_items` server-side, exactly like Chez Sanji's `create_order`.

## Database

- `supabase/migrations/0029_marketplace_schema.sql` — tables, enums, RLS.
- `supabase/migrations/0030_marketplace_functions.sql` — the RPCs above,
  plus `mk_register_vendor` / `mk_register_courier` (self-serve signup) and
  `mk_admin_set_vendor_status` / `mk_admin_set_courier_active`.

Run the usual way:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

No seed data ships for vendors/menu items — unlike Chez Sanji's fixed menu,
a marketplace's vendors are created by real signups, not fixtures tied to
auth users that don't exist yet. To get a demo vendor live:

1. Open the app, choose **Je suis restaurant → Devenir partenaire**, sign up.
2. As an admin (see bootstrap below), go to **Restaurants** and activate it.
3. Sign back in as that vendor and add a few menu items.

### Bootstrapping the first admin

There's no self-serve admin signup by design. After someone signs up through
any flow above (or you create a user directly in the Supabase dashboard),
promote them:

```sql
insert into mk_admins (id, full_name)
values ('<their auth.users id>', 'Platform Admin');
```

They can then log in at `/auth/admin`.

For the live deployment above, this step is already done — an admin
account exists for the project owner's email; ask them for the password
rather than re-running this.

## Quick start

```bash
cd apps/marketplace
cp .env.example .env   # fill in your Supabase URL + anon key
npm install
npm run dev
```

**Trying the live deployment:** phone login (customer and courier) runs on
a Supabase Test OTP for now (no real SMS provider wired up yet, same
shortcut Chez Sanji uses for demos) — use `699000001` as the phone number
and `123456` as the code. Vendor/admin sign-in is real email + password,
with email confirmation auto-approved so a fresh signup can sign in
immediately.

## What's intentionally out of scope for this first version

- Live courier GPS tracking (order tracking currently shows status steps +
  courier name/phone, not a moving map pin).
- Distance-based delivery pricing — the delivery fee is a flat 1000 FCFA for
  now, same shortcut Chez Sanji took for its own delivery fee.
- The two-sided referral program and WhatsApp-first growth loop described in
  the marketing strategy this project grew out of — natural next step once
  the core marketplace is live and has real vendors on it.
