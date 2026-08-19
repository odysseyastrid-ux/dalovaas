-- Dalovaas — multi-vendor delivery marketplace schema.
-- Lives alongside the Chez Sanji tables in the same Supabase project;
-- every table/type/function here is prefixed `mk_` so nothing collides.
-- Same philosophy as Chez Sanji: server-authoritative order lifecycle via
-- SECURITY DEFINER RPCs, RLS on every table, client never sets prices,
-- commission, ref, or status transitions directly.

create extension if not exists pgcrypto;

create type mk_vendor_status as enum ('pending', 'active', 'suspended');
create type mk_order_status as enum ('pending', 'accepted', 'ready_for_pickup', 'picked_up', 'delivered', 'cancelled');
create type mk_payment_method as enum ('mtn_momo', 'orange_money', 'cash');
create type mk_vehicle_type as enum ('bike', 'moto', 'car');

-- ---------------------------------------------------------------------------
-- mk_admins — platform operators (bootstrap manually, see apps/marketplace/README.md)
-- ---------------------------------------------------------------------------
create table mk_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- mk_customers — one row per phone-auth customer
-- ---------------------------------------------------------------------------
create table mk_customers (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null default '',
  full_name text not null default '',
  default_address text,
  default_lat double precision,
  default_lng double precision,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- mk_vendors — restaurant partners (self-serve signup, admin approves)
-- ---------------------------------------------------------------------------
create table mk_vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  name_fr text not null default '',
  description text not null default '',
  description_fr text not null default '',
  cuisine_type text not null default '',
  phone text not null default '',
  city text not null default '',
  address text not null default '',
  lat double precision,
  lng double precision,
  logo_url text,
  cover_url text,
  commission_rate numeric(4,3) not null default 0.150 check (commission_rate between 0 and 1),
  status mk_vendor_status not null default 'pending',
  rating numeric(2,1) not null default 5.0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index mk_vendors_status_idx on mk_vendors (status);
create index mk_vendors_city_idx on mk_vendors (city);

-- ---------------------------------------------------------------------------
-- mk_menu_items
-- ---------------------------------------------------------------------------
create table mk_menu_items (
  id text primary key default ('mki_' || substr(md5(gen_random_uuid()::text), 1, 10)),
  vendor_id uuid not null references mk_vendors(id) on delete cascade,
  category text not null default 'main',
  name text not null,
  name_fr text not null default '',
  description text not null default '',
  description_fr text not null default '',
  price integer not null check (price >= 0),
  image_url text,
  available boolean not null default true,
  deleted boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mk_menu_items_vendor_idx on mk_menu_items (vendor_id) where not deleted;

-- ---------------------------------------------------------------------------
-- mk_couriers — self-serve signup, no approval gate for MVP (toggle active)
-- ---------------------------------------------------------------------------
create table mk_couriers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  vehicle_type mk_vehicle_type not null default 'moto',
  city text not null default '',
  status text not null default 'offline' check (status in ('offline', 'online', 'on_delivery')),
  active boolean not null default true,
  rating numeric(2,1) not null default 5.0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index mk_couriers_status_idx on mk_couriers (status) where active;

-- ---------------------------------------------------------------------------
-- mk_orders
-- ---------------------------------------------------------------------------
create table mk_orders (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  customer_id uuid not null references auth.users(id),
  customer_name text not null,
  customer_phone text not null,
  vendor_id uuid not null references mk_vendors(id),
  vendor_name text not null,
  courier_id uuid references auth.users(id),
  courier_name text,
  courier_phone text,
  items jsonb not null,                 -- [{ item_id, name, unit_price, qty, line_total }]
  subtotal integer not null check (subtotal >= 0),
  delivery_fee integer not null default 0,
  commission_amount integer not null default 0,
  total integer not null check (total >= 0),
  delivery_address text not null,
  delivery_lat double precision,
  delivery_lng double precision,
  payment_method mk_payment_method not null,
  paid boolean not null default false,
  notes text,
  status mk_order_status not null default 'pending',
  cancel_reason text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz
);

create index mk_orders_customer_idx on mk_orders (customer_id);
create index mk_orders_vendor_idx on mk_orders (vendor_id);
create index mk_orders_courier_idx on mk_orders (courier_id);
create index mk_orders_status_idx on mk_orders (status);
create index mk_orders_unassigned_idx on mk_orders (status) where status = 'ready_for_pickup' and courier_id is null;

-- ---------------------------------------------------------------------------
-- mk_ratings
-- ---------------------------------------------------------------------------
create table mk_ratings (
  id bigint generated always as identity primary key,
  order_id uuid not null unique references mk_orders(id) on delete cascade,
  customer_id uuid not null references auth.users(id),
  vendor_id uuid not null references mk_vendors(id),
  courier_id uuid references auth.users(id),
  vendor_rating smallint check (vendor_rating between 1 and 5),
  courier_rating smallint check (courier_rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function mk_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mk_admins where id = auth.uid());
$$;

create or replace function mk_owns_vendor(p_vendor_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mk_vendors where id = p_vendor_id and owner_id = auth.uid());
$$;

create or replace function mk_is_courier() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mk_couriers where id = auth.uid());
$$;

create or replace function mk_handle_new_customer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.phone is not null and length(new.phone) > 0 then
    insert into mk_customers (id, phone) values (new.id, new.phone)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger mk_on_auth_user_created
  after insert on auth.users
  for each row execute function mk_handle_new_customer();

create or replace function mk_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger mk_menu_items_touch before update on mk_menu_items
  for each row execute function mk_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table mk_admins enable row level security;
alter table mk_customers enable row level security;
alter table mk_vendors enable row level security;
alter table mk_menu_items enable row level security;
alter table mk_couriers enable row level security;
alter table mk_orders enable row level security;
alter table mk_ratings enable row level security;

create policy mk_admins_select on mk_admins for select using (mk_is_admin());

create policy mk_customers_select_own on mk_customers for select using (id = auth.uid() or mk_is_admin());
create policy mk_customers_update_own on mk_customers for update using (id = auth.uid()) with check (id = auth.uid());

-- vendors: active vendors are publicly browsable; owner and admin see their
-- own regardless of status (pending/suspended)
create policy mk_vendors_select on mk_vendors for select
  using (status = 'active' or owner_id = auth.uid() or mk_is_admin());
revoke insert, update, delete on mk_vendors from authenticated, anon;
grant select, update (
  name, name_fr, description, description_fr, cuisine_type, phone, city, address, lat, lng, logo_url, cover_url
) on mk_vendors to authenticated;
create policy mk_vendors_update_own on mk_vendors for update
  using (owner_id = auth.uid() or mk_is_admin()) with check (owner_id = auth.uid() or mk_is_admin());

-- menu items: publicly browsable when the vendor is active; owner/admin manage
create policy mk_menu_items_select on mk_menu_items for select
  using (
    not deleted and (
      exists (select 1 from mk_vendors v where v.id = vendor_id and v.status = 'active')
      or mk_owns_vendor(vendor_id) or mk_is_admin()
    )
  );
create policy mk_menu_items_write on mk_menu_items for all
  using (mk_owns_vendor(vendor_id) or mk_is_admin())
  with check (mk_owns_vendor(vendor_id) or mk_is_admin());

-- couriers: own row + admin; vendors/customers never query this table
-- directly (order rows carry a courier_name/courier_phone snapshot)
create policy mk_couriers_select_own on mk_couriers for select using (id = auth.uid() or mk_is_admin());
revoke insert, update, delete on mk_couriers from authenticated, anon;
grant select, update (full_name, phone, vehicle_type, city, status) on mk_couriers to authenticated;
create policy mk_couriers_update_own on mk_couriers for update
  using (id = auth.uid() or mk_is_admin()) with check (id = auth.uid() or mk_is_admin());

-- orders: customer, assigned courier, owning vendor, admin — never anyone
-- else. No insert/update policies for authenticated/anon: every mutation
-- goes through the SECURITY DEFINER RPCs below.
create policy mk_orders_select on mk_orders for select
  using (
    customer_id = auth.uid()
    or courier_id = auth.uid()
    or mk_owns_vendor(vendor_id)
    or mk_is_admin()
  );
revoke insert, update, delete on mk_orders from authenticated, anon;

-- unassigned deliveries must be visible to every online courier so they can
-- claim one — a narrow, deliberate carve-out of the policy above
create policy mk_orders_select_available_for_couriers on mk_orders for select
  using (status = 'ready_for_pickup' and courier_id is null and mk_is_courier());

create policy mk_ratings_select on mk_ratings for select
  using (customer_id = auth.uid() or courier_id = auth.uid() or mk_owns_vendor(vendor_id) or mk_is_admin());
revoke insert, update, delete on mk_ratings from authenticated, anon;

alter publication supabase_realtime add table mk_orders;
alter publication supabase_realtime add table mk_menu_items;
alter publication supabase_realtime add table mk_vendors;
