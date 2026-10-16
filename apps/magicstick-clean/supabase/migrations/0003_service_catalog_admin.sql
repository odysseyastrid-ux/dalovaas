-- Lets the owner manage the services catalog (categories, pricing, active
-- status) from admin.html instead of editing rows by hand in the Supabase
-- dashboard, and keeps an audit trail of what changed.

-- ---------------------------------------------------------------------------
-- service_categories — groups the bookable catalog (Residential, Commercial,
-- ...) for display in the admin dashboard. Not shown on the public site.
-- ---------------------------------------------------------------------------
create table service_categories (
  id text primary key,
  name text not null,
  name_fr text not null default '',
  sort_order integer not null default 0
);

alter table service_categories enable row level security;

create policy "admins can read service categories"
  on service_categories for select
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can manage service categories"
  on service_categories for all
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));

alter table services add column category_id text references service_categories(id) on delete set null;

-- services already has "anyone can read active services" (select); the
-- catalog itself was never editable from the dashboard — only quotes and
-- bookings were. Add the missing admin write policies.
create policy "admins can read all services"
  on services for select
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can insert services"
  on services for insert
  to authenticated
  with check (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can update services"
  on services for update
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));

-- ---------------------------------------------------------------------------
-- activity_logs — audit trail of catalog changes made from admin.html.
-- ---------------------------------------------------------------------------
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admin_users(id) on delete set null,
  action text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);

alter table activity_logs enable row level security;

create policy "admins can read activity logs"
  on activity_logs for select
  to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can write activity logs"
  on activity_logs for insert
  to authenticated
  with check (exists (select 1 from admin_users where id = auth.uid()));

create index activity_logs_created_at_idx on activity_logs (created_at desc);
