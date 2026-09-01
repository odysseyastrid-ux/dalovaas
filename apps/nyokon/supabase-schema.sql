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

-- Product catalog — staff-managed from staff.html (add/edit/hide/delete
-- products, set prices, upload photos). Seeded below with the original
-- static catalog from script.js, so nothing changes on the live site
-- until staff edits something.

create table if not exists public.products (
  id text primary key,
  category text not null,
  tag text,
  price numeric not null,
  was numeric,
  sizes text[],
  name_en text not null,
  name_fr text not null,
  sub_en text,
  sub_fr text,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists products_select_public on public.products;
create policy products_select_public
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists products_insert_staff on public.products;
create policy products_insert_staff
  on public.products for insert
  to authenticated
  with check (true);

drop policy if exists products_update_staff on public.products;
create policy products_update_staff
  on public.products for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists products_delete_staff on public.products;
create policy products_delete_staff
  on public.products for delete
  to authenticated
  using (true);

insert into public.products (id, category, tag, price, was, sizes, name_en, name_fr, sub_en, sub_fr) values
  ('m1','men','new',168,null,array['S','M','L','XL'],'Flight Bomber Jacket','Blouson Bomber','Navy','Marine'),
  ('m2','men','new',98,null,array['S','M','L','XL'],'Oversized Hoodie','Hoodie Oversize','Off-Black','Noir Anthracite'),
  ('m3','men','sale',110,130,array['S','M','L','XL'],'Cargo Pant','Pantalon Cargo','Charcoal','Anthracite'),
  ('m4','men',null,145,null,array['S','M','L','XL'],'Denim Jacket','Veste en Jean','Washed Blue','Bleu Délavé'),
  ('w1','women','new',128,null,array['S','M','L','XL'],'Cropped Puffer Vest','Doudoune Crop Sans Manches','Black','Noir'),
  ('w2','women',null,118,null,array['S','M','L','XL'],'Wide Leg Trouser','Pantalon Large','Sand','Sable'),
  ('w3','women','new',96,null,array['S','M','L','XL'],'Pleated Midi Skirt','Jupe Midi Plissée','Ivory','Ivoire'),
  ('w4','women',null,38,null,array['S','M','L','XL'],'Ribbed Tank Top','Débardeur Côtelé','White','Blanc'),
  ('k1','kids','new',58,null,array['4-5Y','6-7Y','8-9Y','10-11Y'],'Kids Logo Hoodie','Hoodie Logo Enfant','Grey Marl','Gris Chiné'),
  ('k2','kids',null,52,null,array['4-5Y','6-7Y','8-9Y','10-11Y'],'Kids Cargo Pant','Pantalon Cargo Enfant','Khaki','Kaki'),
  ('k3','kids','new',64,null,array['4-5Y','6-7Y','8-9Y','10-11Y'],'Kids Windbreaker','Coupe-Vent Enfant','Red','Rouge'),
  ('s1','shoes','new',145,null,array['40','41','42','43','44','45'],'Chunky Trainer','Sneaker Chunky','White / Black','Blanc / Noir'),
  ('s2','shoes',null,110,null,array['40','41','42','43','44','45'],'Low-Top Sneaker','Sneaker Basse','Triple White','Tout Blanc'),
  ('s3','shoes','sale',158,185,array['40','41','42','43','44','45'],'Combat Boot','Rangers','Black Leather','Cuir Noir'),
  ('b1','bags',null,64,null,null,'Crossbody Bag','Sacoche Bandoulière','Black Nylon','Nylon Noir'),
  ('b2','bags','new',48,null,null,'Canvas Tote Bag','Tote Bag en Toile','Natural','Écru'),
  ('b3','bags','new',135,null,null,'Weekend Duffel','Sac Week-end','Olive','Olive'),
  ('a1','accessories',null,32,null,null,'Beanie','Bonnet','Black','Noir'),
  ('a2','accessories',null,34,null,null,'Snapback Cap','Casquette Snapback','Black','Noir'),
  ('a3','accessories','new',42,null,null,'Reversible Belt','Ceinture Réversible','Black / Brown','Noir / Marron'),
  ('f1','fragrance','new',78,null,null,'Eau de Parfum 50ml','Eau de Parfum 50ml','Signature Scent','Fragrance Signature'),
  ('f2','fragrance',null,110,null,null,'Eau de Parfum 100ml','Eau de Parfum 100ml','Signature Scent','Fragrance Signature'),
  ('f3','fragrance',null,28,null,null,'Travel Spray 15ml','Vaporisateur Nomade 15ml','Signature Scent','Fragrance Signature')
on conflict (id) do nothing;

-- Taxonomy upgrade: products now nest under a top-level gender (men /
-- women / kids / unisex — unisex items show under both Homme and
-- Femme) with a subcategory type (clothing / shoes / bags /
-- accessories / fragrance), so every subcategory lives inside Hommes,
-- Femmes or Enfants instead of sitting as its own top-level tab. Kids
-- items also carry kids_group (girls / boys / unisex). This backfills
-- gender/type/kids_group from the old flat `category` column so
-- nothing breaks for rows that already exist; `category` itself is
-- kept (unused going forward) rather than dropped, so this is safe to
-- re-run and never destroys data.

alter table public.products add column if not exists gender text;
alter table public.products add column if not exists type text;
alter table public.products add column if not exists kids_group text;
alter table public.products alter column category drop not null;

update public.products set gender = case
    when category = 'men' then 'men'
    when category = 'women' then 'women'
    when category = 'kids' then 'kids'
    else 'unisex'
  end
where gender is null;

update public.products set type = case
    when category in ('men','women','kids') then 'clothing'
    when category in ('shoes','bags','accessories','fragrance') then category
    else 'clothing'
  end
where type is null;

update public.products set kids_group = 'unisex'
where gender = 'kids' and kids_group is null;

alter table public.products alter column gender set default 'unisex';
alter table public.products alter column type set default 'clothing';

-- Product detail sheet: materials, clothing fit/care, fragrance specs,
-- colorways, and free-form merchandising tags (separate from the
-- single `tag` column, which still drives the NEW/SALE badge on the
-- storefront card). All nullable/optional — only the fields relevant
-- to a product's `type` are shown in the staff form.

alter table public.products add column if not exists material text;
alter table public.products add column if not exists fit text;
alter table public.products add column if not exists care_instructions text;
alter table public.products add column if not exists volume_ml integer;
alter table public.products add column if not exists olfactory_family text;
alter table public.products add column if not exists concentration text;
alter table public.products add column if not exists colors jsonb;
alter table public.products add column if not exists tags text[];
alter table public.products add column if not exists sold_out boolean not null default false;

-- Variants: per size (+ optional color) stock and SKU. Optional per
-- product — a product with no variant rows is treated as always
-- available (unchanged behaviour); once staff adds variant rows for a
-- product, a size with 0 stock shows as sold out on that size only.

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  size text,
  color_name text,
  sku text,
  stock integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.product_variants enable row level security;

drop policy if exists product_variants_select_public on public.product_variants;
create policy product_variants_select_public
  on public.product_variants for select
  to anon, authenticated
  using (true);

drop policy if exists product_variants_write_staff on public.product_variants;
create policy product_variants_write_staff
  on public.product_variants for all
  to authenticated
  using (true)
  with check (true);

-- Cost price lives in its own staff-only table (not a column on
-- `products`) so it is never reachable through the public anon key —
-- there is no anon policy on this table at all, so anon queries
-- return zero rows regardless of what they ask for.

create table if not exists public.product_costs (
  product_id text primary key references public.products(id) on delete cascade,
  cost_price numeric,
  updated_at timestamptz not null default now()
);

alter table public.product_costs enable row level security;

drop policy if exists product_costs_staff_only on public.product_costs;
create policy product_costs_staff_only
  on public.product_costs for all
  to authenticated
  using (true)
  with check (true);

-- Product detail page: a real ordered image gallery (the "1/8" style
-- counter needs more than one photo per product) and an optional
-- model-fit caption. Images can be tied to one colorway (color_name)
-- or left null to apply regardless of which color is selected —
-- that's also what drives the product card's hover/click color swap,
-- so no separate "swatch image" field is needed on `colors`.

alter table public.products add column if not exists model_stats text;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  color_name text,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.product_images enable row level security;

drop policy if exists product_images_select_public on public.product_images;
create policy product_images_select_public
  on public.product_images for select
  to anon, authenticated
  using (true);

drop policy if exists product_images_write_staff on public.product_images;
create policy product_images_write_staff
  on public.product_images for all
  to authenticated
  using (true)
  with check (true);

-- Atomic stock decrement at checkout. There's no Node/Prisma backend
-- on this static site to hold a database transaction open across
-- requests, so the "check available stock, then decrement" logic
-- that would normally live in an API route lives here instead, as a
-- single Postgres function — the function body already runs as one
-- transaction, and `for update` row-locks each variant so two
-- customers checking out the last unit at the same time can't both
-- succeed. `security definer` lets anon call it (checkout is
-- anonymous) without being granted raw UPDATE on product_variants,
-- which stays staff-only.

create or replace function public.decrement_variant_stock(items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  v_id uuid;
  v_qty integer;
  v_current integer;
begin
  for item in select * from jsonb_array_elements(items)
  loop
    v_id := (item->>'variant_id')::uuid;
    v_qty := (item->>'qty')::integer;

    select stock into v_current from public.product_variants where id = v_id for update;

    if v_current is null then
      raise exception 'VARIANT_NOT_FOUND:%', v_id;
    end if;
    if v_current < v_qty then
      raise exception 'INSUFFICIENT_STOCK:%:available=%:requested=%', v_id, v_current, v_qty;
    end if;

    update public.product_variants set stock = stock - v_qty where id = v_id;
  end loop;
end;
$$;

revoke all on function public.decrement_variant_stock(jsonb) from public;
grant execute on function public.decrement_variant_stock(jsonb) to anon, authenticated;

-- Delivery city, alongside the existing free-text address field.
alter table public.orders add column if not exists city text;

-- Loyalty points ("carte de fidélité"). Customers have no login on
-- this site, so the phone number they already give at checkout is
-- the account key. Points are earned automatically when staff
-- confirms an order (see the trigger below) and can be spent to pay
-- for a later order in full. Only XOF orders earn points — the site
-- doesn't have a reliable FCFA conversion for other currencies to
-- award points against.

insert into public.settings (key, value) values
  ('loyalty_earn_divisor', '100'),
  ('loyalty_point_value', '10')
on conflict (key) do nothing;
-- loyalty_earn_divisor: customer earns 1 point per this many FCFA spent.
-- loyalty_point_value: 1 point is worth this many FCFA when redeeming.

create table if not exists public.customers (
  phone text primary key,
  name text,
  points integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;

drop policy if exists customers_select_public on public.customers;
create policy customers_select_public
  on public.customers for select
  to anon, authenticated
  using (true);

drop policy if exists customers_write_staff on public.customers;
create policy customers_write_staff
  on public.customers for all
  to authenticated
  using (true)
  with check (true);

-- Awards points the moment staff marks an order 'confirmed' (and
-- only then, so a cancelled or still-pending order never pays out).
create or replace function public.award_loyalty_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_divisor numeric;
  v_points integer;
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed'
     and new.currency = 'XOF' and new.payment_method <> 'fidelity' then
    select coalesce(value::numeric, 100) into v_divisor from public.settings where key = 'loyalty_earn_divisor';
    v_points := floor(new.subtotal / greatest(v_divisor, 1));
    if v_points > 0 then
      insert into public.customers (phone, name, points, updated_at)
      values (new.customer_phone, new.customer_name, v_points, now())
      on conflict (phone) do update
        set points = public.customers.points + excluded.points,
            name = coalesce(excluded.name, public.customers.name),
            updated_at = now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_award_loyalty_points on public.orders;
create trigger orders_award_loyalty_points
  after update on public.orders
  for each row
  execute function public.award_loyalty_points();

-- Atomic redemption at checkout — same "check then spend" pattern as
-- decrement_variant_stock, so two orders can't both spend the same
-- points. Raises INSUFFICIENT_POINTS if the balance is too low.
create or replace function public.redeem_loyalty_points(p_phone text, p_points integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer;
begin
  select points into v_current from public.customers where phone = p_phone for update;
  if v_current is null then
    raise exception 'CUSTOMER_NOT_FOUND:%', p_phone;
  end if;
  if v_current < p_points then
    raise exception 'INSUFFICIENT_POINTS:available=%:requested=%', v_current, p_points;
  end if;
  update public.customers set points = points - p_points, updated_at = now() where phone = p_phone;
end;
$$;

revoke all on function public.redeem_loyalty_points(text, integer) from public;
grant execute on function public.redeem_loyalty_points(text, integer) to anon, authenticated;

-- Product detail page additions: country of origin and a per-product
-- delivery estimate (falls back to a generic message client-side when
-- left blank, since made-to-order pieces can have a much longer lead
-- time than in-stock items).
alter table public.products add column if not exists origin_country text;
alter table public.products add column if not exists delivery_estimate text;
