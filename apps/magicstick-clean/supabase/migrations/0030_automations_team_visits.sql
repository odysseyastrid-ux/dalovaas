-- Step 2 of the dashboard (owner's plan, Nov 16, 2026).

-- 1. Team: employees receive their job sheets by email (no dashboard access).
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (char_length(phone) <= 40),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table employees enable row level security;
create policy "admins manage employees" on employees for all to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant select, insert, update, delete on employees to authenticated;

-- 2. Order automations: each automatic email is stamped once it is sent, so
--    the automations function (run every 15 min + right after dashboard
--    actions) never sends anything twice.
alter table quote_requests
  add column if not exists assigned_employee_id uuid references employees(id) on delete set null,
  add column if not exists receipt_sent_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists thanks_sent_at timestamptz,
  add column if not exists unpaid_reminder_at timestamptz,
  add column if not exists job_sheet_employee_id uuid,
  add column if not exists job_sheet_sent_at timestamptz;
grant update (assigned_employee_id) on quote_requests to authenticated;

-- Existing rows count as handled: automations only act on what happens from
-- now on (no surprise emails to past or test clients).
update quote_requests set
  receipt_sent_at = coalesce(receipt_sent_at, case when paid_at is not null then now() end),
  thanks_sent_at = coalesce(thanks_sent_at, case when completed_at is not null then now() end),
  unpaid_reminder_at = coalesce(unpaid_reminder_at, case when quoted_at is not null and paid_at is null then now() end),
  reminder_sent_at = coalesce(reminder_sent_at, case when scheduled_date is not null then now() end);

-- 3. First-party visit counter: anonymous (no IP, no cookie), written by the
--    site with the public key (insert only), read by admins only.
create table if not exists page_views (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  path text not null check (char_length(path) <= 200),
  ref_host text check (char_length(ref_host) <= 100),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  lang text check (char_length(lang) <= 12),
  tz text check (char_length(tz) <= 60),
  session_id text check (char_length(session_id) <= 40)
);
create index if not exists page_views_at_idx on page_views (at desc);
alter table page_views enable row level security;
create policy "the site can count a visit" on page_views for insert to anon, authenticated with check (true);
create policy "admins read visits" on page_views for select to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));
grant insert (path, ref_host, device, lang, tz, session_id) on page_views to anon, authenticated;
grant select on page_views to authenticated;

-- 4. Run the automations every 15 minutes (the function is idempotent and
--    rate limited, so it needs no secret).
select cron.unschedule('magicstick-automations') where exists (select 1 from cron.job where jobname = 'magicstick-automations');
select cron.schedule('magicstick-automations', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://siqpcnhfpseorjuwfrop.supabase.co/functions/v1/automations',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
$$);
