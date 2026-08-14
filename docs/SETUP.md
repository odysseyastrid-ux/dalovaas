# Chez Sanji — Setup & Deploy

This turns the design prototype into a real app: a Postgres/Supabase backend
shared by every device (customer phones + the kitchen/counter dashboard),
replacing the prototype's per-browser `localStorage`.

## 0. Prerequisites

- A [Supabase](https://supabase.com) project (free tier is enough to start).
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed locally (`npm i -g supabase` or `brew install supabase/tap/supabase`).
- Node 20+ for the frontend.
- (For production) a WhatsApp Business Cloud API app (Meta), and an SMS/OTP
  provider for phone login (Twilio Verify, Vonage, MessageBird, or a
  Cameroon-reaching aggregator).

## 1. Provision the database

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push                 # applies supabase/migrations/*.sql
psql "$(supabase db url)" -f supabase/seed.sql   # or run seed.sql in the SQL editor
```

This creates all tables, RLS policies, and the RPC functions the frontend
calls (`create_order`, `validate_order_payment`, `mark_order_delivered`,
`upsert_menu_item`, `redeem_reward`, …). It also seeds the menu, rewards and
the `SANJ10` promo code from the original prototype.

`0002_functions.sql` tries to schedule `run_order_status_cron()` every
minute via `pg_cron`. If your project doesn't have `pg_cron` enabled
(Database → Extensions), skip it and use the scheduled Edge Function
instead (step 4) — this is the job that flips an order from "Preparing" to
"Ready" once its 7-minute timer elapses, and one of the two paths is
required for that to work at all.

## 2. Configure customer phone login (real OTP)

The prototype "sent" a WhatsApp deep link with the code shown in the UI —
not real delivery. This app uses Supabase's native Phone Auth instead:

Dashboard → Authentication → Providers → Phone → enable, then plug in a
real SMS provider (Twilio, MessageBird, Vonage, or a Cameroon-reaching
aggregator). `supabase/config.toml` has a commented Twilio example if
you're managing config-as-code instead of the dashboard.

A new `accounts` row is created automatically for every new phone-auth
user (`handle_new_customer()` trigger in `0001_init.sql`) — nothing else to
wire up.

## 3. Configure staff accounts (replaces "Mode développeur")

The prototype's admin gate was a shared password baked into the client.
Real staff are rows in `staff`, tied 1:1 to a Supabase Auth user, with a
`role` of `cashier` or `manager`.

**Bootstrap the first manager** (one-time, via SQL editor, after they've
signed up once through Dashboard → Authentication → Users → Invite, or via
`supabase.auth.admin.createUser`):

```sql
insert into staff (id, name, role) values ('<their-auth-user-id>', 'Sanji', 'manager');
```

After that, managers can invite more staff from the dashboard's **Staff**
tab, which calls the `create-staff` Edge Function (creates the Auth user +
`staff` row and returns a temporary password to share).

## 4. Deploy the Edge Functions

```bash
supabase functions deploy notify-order-event --no-verify-jwt
supabase functions deploy advance-order-status --no-verify-jwt
supabase functions deploy create-staff
```

Set secrets (WhatsApp + Web Push are optional but recommended for production):

```bash
supabase secrets set \
  WHATSAPP_TOKEN=... \
  WHATSAPP_PHONE_NUMBER_ID=... \
  WHATSAPP_STAFF_NUMBERS=237652776763,237658715397 \
  VAPID_PUBLIC_KEY=... \
  VAPID_PRIVATE_KEY=... \
  VAPID_SUBJECT=mailto:ops@yourdomain.com
```

Generate a VAPID key pair once with `npx web-push generate-vapid-keys`.

### Wire the order-event webhook

`notify-order-event` fires on inserts into `event_outbox` (which `create_order`,
`validate_order_payment` and the status-advance cron populate automatically).
Connect the two with a **Database Webhook**:

Dashboard → Database → Webhooks → Create a new webhook
- Table: `event_outbox`, Events: `INSERT`
- Type: Supabase Edge Function → `notify-order-event`

### Schedule the status-advance cron

Dashboard → Edge Functions → `advance-order-status` → Cron → `*/1 * * * *`.
(Redundant with the `pg_cron` job from step 1 if that extension is enabled
on your project — harmless to run both, since `run_order_status_cron()` is
idempotent.)

## 5. Frontend

```bash
cd apps/web
cp .env.example .env      # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

- Customer app: `/`
- Staff dashboard: `/staff` (sign in with the email/password created in step 3)

Deploy `apps/web` (Vite build, `npm run build` → `dist/`) to Vercel,
Netlify, Cloudflare Pages, or any static host — it only talks to Supabase,
there's no separate app server to run.

## 6. Payment proofs & menu photos

Two Storage buckets are created by `0003_storage.sql`:
- `payment-proofs` (private) — customers upload into their own folder,
  staff can read all. The frontend stores the *object path*, not a public
  URL, and the staff dashboard mints a short-lived signed URL when someone
  clicks "Reçu".
- `menu-photos` (public) — manager-writable, for product images. The
  current build renders a placeholder tile; wiring `image_url` into
  `<img>` tags in `HomeScreen`/`ItemDetailScreen` is a small follow-up once
  real product photos exist.

## What's real vs. what still needs your keys

Everything in `supabase/` and `apps/web/` is functional, real code — no
mocked data paths, no client-trusted prices or statuses. What's still
required from you before it's live for real customers:

- A Supabase project (schema + RLS + RPCs all check out against
  `supabase db push` locally in dev — see below).
- An SMS/OTP provider for phone login.
- A WhatsApp Business Cloud API app + token, if you want the staff-group
  and customer WhatsApp notifications (the in-app + web-push paths work
  without it).
- VAPID keys, if you want browser push notifications.

## Local dev without a live Supabase project

`supabase start` runs the whole stack (Postgres, Auth, Storage, Realtime,
Edge Functions) in Docker for local development — point `apps/web/.env` at
the local URL/anon key it prints. Phone OTP in local dev uses Supabase's
test SMS provider (codes are visible in `supabase status` / Inbucket), so
you can exercise the full login → order → tracking → staff-validate loop
before wiring a real SMS vendor.
