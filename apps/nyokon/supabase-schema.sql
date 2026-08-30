-- nyøkøn — staff photo uploads
-- Run this once in the Supabase SQL Editor (Database → SQL Editor → New query)
-- for the project this site is wired to.

create table if not exists public.site_images (
  slot text primary key,
  image_url text,
  updated_at timestamptz not null default now()
);

insert into public.site_images (slot) values
  ('hero'), ('lookbook_1'), ('lookbook_2'), ('lookbook_3'),
  ('lookbook_4'), ('lookbook_5'), ('lookbook_6')
on conflict (slot) do nothing;

alter table public.site_images enable row level security;

drop policy if exists site_images_select_public on public.site_images;
create policy site_images_select_public
  on public.site_images for select
  to anon, authenticated
  using (true);

drop policy if exists site_images_insert_staff on public.site_images;
create policy site_images_insert_staff
  on public.site_images for insert
  to authenticated
  with check (true);

drop policy if exists site_images_update_staff on public.site_images;
create policy site_images_update_staff
  on public.site_images for update
  to authenticated
  using (true)
  with check (true);

-- Storage bucket for the uploaded photo files themselves.
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

drop policy if exists site_images_bucket_select_public on storage.objects;
create policy site_images_bucket_select_public
  on storage.objects for select
  to public
  using (bucket_id = 'site-images');

drop policy if exists site_images_bucket_insert_staff on storage.objects;
create policy site_images_bucket_insert_staff
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-images');

drop policy if exists site_images_bucket_update_staff on storage.objects;
create policy site_images_bucket_update_staff
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-images');

-- Checkout: orders, editable payment account numbers, and a private
-- bucket for uploaded mobile-money payment receipts.

create table if not exists public.settings (
  key text primary key,
  value text
);

insert into public.settings (key, value) values
  ('orange_money_number', ''),
  ('orange_money_name', ''),
  ('mtn_momo_number', ''),
  ('mtn_momo_name', '')
on conflict (key) do nothing;

alter table public.settings enable row level security;

drop policy if exists settings_select_public on public.settings;
create policy settings_select_public
  on public.settings for select
  to anon, authenticated
  using (true);

drop policy if exists settings_insert_staff on public.settings;
create policy settings_insert_staff
  on public.settings for insert
  to authenticated
  with check (true);

drop policy if exists settings_update_staff on public.settings;
create policy settings_update_staff
  on public.settings for update
  to authenticated
  using (true)
  with check (true);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null,
  customer_name text not null,
  customer_phone text not null,
  fulfillment text not null default 'pickup',
  address text,
  items jsonb not null,
  subtotal numeric not null,
  currency text not null default 'XOF',
  payment_method text not null,
  receipt_path text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists orders_insert_public on public.orders;
create policy orders_insert_public
  on public.orders for insert
  to anon, authenticated
  with check (true);

drop policy if exists orders_select_staff on public.orders;
create policy orders_select_staff
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('order-receipts', 'order-receipts', false)
on conflict (id) do nothing;

drop policy if exists order_receipts_insert_public on storage.objects;
create policy order_receipts_insert_public
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'order-receipts');

drop policy if exists order_receipts_select_staff on storage.objects;
create policy order_receipts_select_staff
  on storage.objects for select
  to authenticated
  using (bucket_id = 'order-receipts');

-- Promotions: scheduled campaigns staff can create ahead of time. Only
-- a promotion whose window (starts_at..ends_at) contains "now" and
-- that is marked active is shown on the site, in place of the default
-- announcement bar text — a lightweight version of the promo
-- calendars big retailers run (e.g. a Black Friday banner that turns
-- itself on and off on schedule, no manual toggling on the day).

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_fr text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.promotions enable row level security;

drop policy if exists promotions_select_public on public.promotions;
create policy promotions_select_public
  on public.promotions for select
  to anon, authenticated
  using (true);

drop policy if exists promotions_insert_staff on public.promotions;
create policy promotions_insert_staff
  on public.promotions for insert
  to authenticated
  with check (true);

drop policy if exists promotions_update_staff on public.promotions;
create policy promotions_update_staff
  on public.promotions for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists promotions_delete_staff on public.promotions;
create policy promotions_delete_staff
  on public.promotions for delete
  to authenticated
  using (true);
