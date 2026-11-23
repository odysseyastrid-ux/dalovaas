-- Prospecting (owner's request, Nov 23, 2026): businesses that could send
-- recurring jobs (cleaning agencies, Airbnb managers, property managers,
-- realtors, contractors) and places to find jobs. The owner works the list
-- from Clients > Prospection; the automations function emails the owner a
-- daily "who to contact today" list (max 10). First contacts are made by the
-- owner (call, or one email from their own mailbox): nothing is sent to a
-- prospect automatically (CASL: one relevant message to a published business
-- address, with a way to say no).

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (category in ('agency', 'airbnb', 'property', 'realtor', 'contractor', 'channel')),
  area text check (char_length(area) <= 80),
  phone text check (char_length(phone) <= 40),
  email text check (email is null or (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  website text check (char_length(website) <= 300),
  lang text not null default 'en' check (lang in ('fr', 'en')),
  status text not null default 'todo' check (status in ('todo', 'contacted', 'interested', 'client', 'not_interested', 'do_not_contact')),
  next_action_on date,
  last_contact_at timestamptz,
  contact_count integer not null default 0,
  intro_sent_at timestamptz,
  notes text check (char_length(notes) <= 1000),
  source text check (char_length(source) <= 300),
  partner_id uuid references partners(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table prospects enable row level security;
create policy "admins manage prospects" on prospects for all to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant select, insert, update, delete on prospects to authenticated;

-- Once-a-day jobs of the automations function (e.g. 'prospect-digest:2026-11-24').
create table if not exists automation_log (
  key text primary key check (char_length(key) <= 80),
  at timestamptz not null default now()
);
alter table automation_log enable row level security; -- service role only
