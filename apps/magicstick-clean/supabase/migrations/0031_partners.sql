-- Partner agencies (owner's decision, Nov 23, 2026): an agency books a cleaning
-- at its client's home at the agency's own hourly rate. Partners pay a deposit
-- (50% by default) BEFORE the job starts; the balance is invoiced from the
-- hours actually worked (3-hour minimum) once the job is marked done.

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  contact_name text check (char_length(contact_name) <= 80),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (char_length(phone) <= 40),
  hourly_rate_cents integer not null check (hourly_rate_cents between 1000 and 100000),
  deposit_percent integer not null default 50 check (deposit_percent between 0 and 100),
  payment_terms_days integer not null default 7 check (payment_terms_days between 0 and 60),
  lang text not null default 'en' check (lang in ('fr', 'en')),
  notes text check (char_length(notes) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table partners enable row level security;
create policy "admins manage partners" on partners for all to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant select, insert, update, delete on partners to authenticated;

alter table quote_requests
  add column if not exists partner_id uuid references partners(id) on delete set null,
  add column if not exists estimated_hours numeric(4,1) check (estimated_hours is null or estimated_hours between 0.5 and 24),
  add column if not exists hourly_rate_cents integer check (hourly_rate_cents is null or hourly_rate_cents between 1000 and 100000),
  add column if not exists deposit_cents integer check (deposit_cents is null or deposit_cents >= 0),
  add column if not exists deposit_paid_at timestamptz,
  add column if not exists actual_hours numeric(4,1) check (actual_hours is null or actual_hours between 0.5 and 24),
  add column if not exists final_amount_cents integer check (final_amount_cents is null or final_amount_cents between 100 and 2000000),
  -- automation stamps (see the automations function)
  add column if not exists confirmation_date date,          -- date the booking confirmation was sent for
  add column if not exists deposit_receipt_at timestamptz,
  add column if not exists deposit_reminder_at timestamptz,
  add column if not exists owner_deposit_alert_at timestamptz,
  add column if not exists invoice_sent_at timestamptz,
  add column if not exists balance_reminder_at timestamptz;

-- The dashboard creates partner orders itself (the public quote form goes
-- through the submit-quote function with the service role).
create policy "admins can create orders" on quote_requests for insert to authenticated
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant insert on quote_requests to authenticated;
grant update (partner_id, estimated_hours, hourly_rate_cents, deposit_cents, deposit_paid_at,
  actual_hours, final_amount_cents) on quote_requests to authenticated;
