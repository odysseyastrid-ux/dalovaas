-- Optional booking add-ons ("extras") and home-size fields.
-- Add-ons are priced per unit (flat, per window/room/load, or per hour) and
-- managed by the owner in the admin dashboard. The price a booking is charged
-- is always recomputed server-side from this table (create-payment-intent) —
-- never trusted from the browser. Extras add to the booking total; the online
-- deposit stays the service's fixed deposit.

create table service_addons (
  id text primary key,
  name text not null,
  name_fr text not null,
  description text,
  description_fr text,
  price_cents integer not null check (price_cents >= 0),
  unit text not null default 'flat' check (unit in ('flat', 'window', 'room', 'load', 'hour')),
  min_qty integer not null default 1 check (min_qty >= 1),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table service_addons enable row level security;

create policy "anyone can read active addons"
  on service_addons for select to anon, authenticated
  using (active);

create policy "admins can read all addons"
  on service_addons for select to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can insert addons"
  on service_addons for insert to authenticated
  with check (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can update addons"
  on service_addons for update to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));

-- Home size (informational, shown to the cleaner and in emails) and the
-- selected extras with their computed line totals, stored on the booking.
alter table bookings
  add column bedrooms integer check (bedrooms >= 0 and bedrooms <= 20),
  add column bathrooms integer check (bathrooms >= 0 and bathrooms <= 20),
  add column half_bathrooms integer check (half_bathrooms >= 0 and half_bathrooms <= 20),
  add column addons jsonb not null default '[]'::jsonb,
  add column addons_cents integer not null default 0 check (addons_cents >= 0);
