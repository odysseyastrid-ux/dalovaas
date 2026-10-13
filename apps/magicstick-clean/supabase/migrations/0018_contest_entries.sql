-- 0018 — "50 cleanings to win" contest (tirage-50-2026).
--
-- Entries come only through the submit-form edge function (service role):
-- no anon/authenticated insert policy exists. One entry per person per
-- contest, enforced on a normalized contact (lower-cased email, or phone
-- digits). Admins read entries and mark winners in the dashboard.

create table if not exists contest_entries (
  id uuid primary key default gen_random_uuid(),
  contest text not null default 'tirage-50-2026' check (char_length(contest) <= 60),
  name text not null check (char_length(name) between 1 and 120),
  contact text not null check (char_length(contact) between 3 and 200),
  contact_key text not null check (char_length(contact_key) between 3 and 200),
  address text not null check (char_length(address) between 3 and 300),
  lang text not null default 'fr' check (lang in ('en', 'fr')),
  source text check (char_length(source) <= 200),
  status text not null default 'entered' check (status in ('entered', 'winner', 'disqualified')),
  created_at timestamptz not null default now(),
  unique (contest, contact_key)
);
create index if not exists contest_entries_created_idx on contest_entries (contest, created_at desc);

alter table contest_entries enable row level security;

create policy "admins can read contest entries"
  on contest_entries for select to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can update contest entries"
  on contest_entries for update to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
