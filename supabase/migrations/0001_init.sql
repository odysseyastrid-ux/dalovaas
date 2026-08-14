-- Chez Sanji — core schema
-- Replaces the prototype's localStorage state with real shared tables.
-- All server-authoritative fields (pending_validation, order_status_index,
-- step_deadline, ref, pickup_code, prices) are only ever written by
-- SECURITY DEFINER RPC functions below — never by direct client writes.

create extension if not exists pgcrypto;

create type order_fulfillment as enum ('pickup', 'delivery', 'dine_in');
create type payment_method as enum ('orange_money', 'mtn_momo', 'cash');
create type order_status as enum ('active', 'done');
create type staff_role as enum ('cashier', 'manager');
create type menu_category as enum ('combo', 'burgers', 'fries', 'poutine', 'shakes', 'cocktails', 'soft_drinks');

-- ---------------------------------------------------------------------------
-- menu_items — single mutable source of truth (README explicitly asks to
-- retire the prototype's separate menuOverrides / addOnOverrides / deletedProducts maps)
-- ---------------------------------------------------------------------------
create table menu_items (
  id text primary key default ('itm_' || substr(md5(gen_random_uuid()::text), 1, 10)),
  cat menu_category not null,
  name text not null,
  name_fr text not null,
  description text not null default '',
  description_fr text not null default '',
  price integer not null check (price >= 0),
  add_ons jsonb not null default '[]'::jsonb,   -- [{ "label": text, "label_fr": text, "price": int }]
  sizes jsonb not null default '[]'::jsonb,      -- [{ "label": text, "label_fr": text, "price_delta": int }]
  image_url text,
  out_of_stock boolean not null default false,
  deleted boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- promo_codes
-- ---------------------------------------------------------------------------
create table promo_codes (
  code text primary key,
  percent_off integer not null check (percent_off between 1 and 100),
  active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- rewards catalog (loyalty redemption)
-- ---------------------------------------------------------------------------
create table rewards (
  id text primary key,
  name text not null,
  name_fr text not null,
  cost integer not null check (cost >= 0),
  item_id text references menu_items(id),
  active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- accounts — one row per customer, keyed by the Supabase Auth user id
-- ---------------------------------------------------------------------------
create table accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  profile_name text not null default '',
  loyalty_points integer not null default 0,
  saved_address text,
  default_payment_method payment_method not null default 'cash',
  notif_promos boolean not null default true,
  notif_order_updates boolean not null default true,
  notif_rewards boolean not null default false,
  push_subscription jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- staff — real accounts, replaces the shared hardcoded admin passwords
-- ---------------------------------------------------------------------------
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role staff_role not null default 'cashier',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  pickup_code text not null,
  customer_id uuid not null references accounts(id),
  customer_name text not null,
  customer_phone text not null,
  fulfillment order_fulfillment not null,
  delivery_address text,
  lines jsonb not null,               -- [{ name, qty, cat, unit_price, add_ons, line_total }]
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null default 0,
  discount integer not null default 0,
  total integer not null check (total >= 0),
  promo_code text references promo_codes(code),
  payment_method payment_method not null,
  paid boolean not null default false,
  pending_validation boolean not null default true,
  payment_proof_url text,
  status order_status not null default 'active',
  order_status_index smallint not null default 0 check (order_status_index between 0 and 3),
  step_deadline timestamptz,
  location jsonb,
  validated_by uuid references staff(id),
  delivered_by uuid references staff(id),
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz
);

create index orders_status_idx on orders (status);
create index orders_customer_idx on orders (customer_id);
create index orders_ref_idx on orders (ref);
create index orders_pending_validation_idx on orders (pending_validation) where status = 'active';

-- ---------------------------------------------------------------------------
-- event_outbox — rows here are what drive WhatsApp + push notifications.
-- A Database Webhook (configured in supabase/config.toml, see docs/SETUP.md)
-- calls the `notify-order-event` Edge Function on insert.
-- ---------------------------------------------------------------------------
create table event_outbox (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders(id) on delete cascade,
  kind text not null,   -- 'created' | 'validated' | 'ready' | 'delivered'
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where id = auth.uid() and active);
$$;

create or replace function is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where id = auth.uid() and active and role = 'manager');
$$;

-- auto-create an accounts row the first time a phone-auth user signs in
create or replace function handle_new_customer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into accounts (id, phone)
  values (new.id, coalesce(new.phone, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_customer();

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger menu_items_touch before update on menu_items
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table menu_items enable row level security;
alter table promo_codes enable row level security;
alter table rewards enable row level security;
alter table accounts enable row level security;
alter table staff enable row level security;
alter table orders enable row level security;
alter table event_outbox enable row level security;

-- menu_items: anyone can browse; only managers can mutate (mutation still
-- goes through the update_menu_item RPC below so price history stays sane)
create policy menu_items_select on menu_items for select using (true);
create policy menu_items_write on menu_items for all
  using (is_manager()) with check (is_manager());

create policy promo_codes_select on promo_codes for select using (active);
create policy promo_codes_write on promo_codes for all
  using (is_manager()) with check (is_manager());

create policy rewards_select on rewards for select using (active);
create policy rewards_write on rewards for all
  using (is_manager()) with check (is_manager());

-- accounts: a customer only ever sees/edits their own row; staff can read all
-- (support / order lookups) but never write a customer's account directly
create policy accounts_select_own on accounts for select using (id = auth.uid() or is_staff());
create policy accounts_update_own on accounts for update using (id = auth.uid()) with check (id = auth.uid());

-- staff: staff can see the roster; only managers can write it (bootstrap
-- exempted — see docs/SETUP.md for the first-manager step)
create policy staff_select on staff for select using (is_staff());
create policy staff_write on staff for all using (is_manager()) with check (is_manager());

-- orders: customers see only their own orders; staff sees everything.
-- No insert/update policies for authenticated/anon — all mutation happens
-- through SECURITY DEFINER RPCs so ref/pickup_code/pending_validation/
-- order_status_index/step_deadline can never be set by the client directly.
create policy orders_select_own on orders for select using (customer_id = auth.uid() or is_staff());

create policy event_outbox_staff_select on event_outbox for select using (is_staff());

revoke insert, update, delete on orders from authenticated, anon;
revoke insert, update, delete on accounts from authenticated, anon;
grant select, update (saved_address, default_payment_method, notif_promos, notif_order_updates, notif_rewards, profile_name, push_subscription) on accounts to authenticated;
