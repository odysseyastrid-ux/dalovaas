-- Magicstick Clean — backend schema
-- Standalone Supabase project (do not point this at the Chez Sanji project
-- in the repo root supabase/ — that schema belongs to a different app).

create extension if not exists pgcrypto;

create type quote_status as enum ('new', 'contacted', 'booked', 'declined');
create type booking_status as enum ('pending_payment', 'confirmed', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- admin_users — marks which auth.users row is the business owner/staff.
-- There is no public sign-up for this; rows are inserted by hand in the
-- Supabase dashboard after the owner creates their account (see SETUP.md).
-- ---------------------------------------------------------------------------
create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

create policy "admins can read the admin list"
  on admin_users for select
  to authenticated
  using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- quote_requests — custom-quote inquiries from the "Get a quote" form
-- (Office Cleaning, Retail, Post-Construction, Move-In/Move-Out, or anyone
-- who'd rather ask than book online).
-- ---------------------------------------------------------------------------
create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  service text not null,
  frequency text not null default 'One-time',
  zone text,
  message text not null default '',
  first_time_offer_claimed boolean not null default false,
  bedrooms text,
  bathrooms text,
  home_type text,
  status quote_status not null default 'new',
  created_at timestamptz not null default now()
);

alter table quote_requests enable row level security;

create policy "anyone can submit a quote request"
  on quote_requests for insert
  to anon, authenticated
  with check (true);

create policy "admins can read quote requests"
  on quote_requests for select
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can update quote requests"
  on quote_requests for update
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- services — the catalog of services that can be booked (and paid for)
-- online. Custom-quote-only services (Office, Retail, Post-Construction)
-- stay quote_requests-only and are not listed here.
-- ---------------------------------------------------------------------------
create table services (
  id text primary key,
  name text not null,
  description text not null default '',
  base_price_cents integer not null check (base_price_cents >= 0),
  deposit_cents integer not null check (deposit_cents >= 0),
  duration_minutes integer not null default 120,
  active boolean not null default true,
  sort_order integer not null default 0
);

alter table services enable row level security;

create policy "anyone can read active services"
  on services for select
  to anon, authenticated
  using (active);

-- ---------------------------------------------------------------------------
-- profiles — one row per customer account, keyed by the Supabase Auth user.
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "a customer can read their own profile"
  on profiles for select
  to authenticated
  using (id = auth.uid());

create policy "a customer can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "a customer can create their own profile"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

-- Auto-create a profile row whenever someone signs up.
create function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- bookings — an online booking for a cataloged service, paid via Stripe
-- Checkout. Guests can book without an account (customer_id stays null);
-- signed-in customers get their bookings linked to their profile.
-- ---------------------------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  guest_name text not null,
  guest_contact text not null,
  service_id text not null references services(id),
  requested_date date not null,
  time_window text not null,
  zone text,
  notes text not null default '',
  status booking_status not null default 'pending_payment',
  amount_cents integer not null check (amount_cents >= 0),
  deposit_cents integer not null check (deposit_cents >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table bookings enable row level security;

create policy "anyone can create a booking"
  on bookings for insert
  to anon, authenticated
  with check (true);

create policy "a customer can read their own bookings"
  on bookings for select
  to authenticated
  using (customer_id = auth.uid());

create policy "admins can read all bookings"
  on bookings for select
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can update bookings"
  on bookings for update
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));

-- The create-checkout-session and stripe-webhook edge functions use the
-- service_role key (bypasses RLS) to create/update rows, so no extra
-- policy is needed for them.

create index bookings_requested_date_idx on bookings (requested_date);
create index bookings_customer_id_idx on bookings (customer_id);
create index quote_requests_created_at_idx on quote_requests (created_at desc);
