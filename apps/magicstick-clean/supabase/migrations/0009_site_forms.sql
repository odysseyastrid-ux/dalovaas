-- Storage for the three public forms that used to only open the visitor's
-- email app: newsletter signup, gift card requests, and job applications.
-- Written exclusively by the `submit-form` edge function (service role), so
-- no anon/authenticated insert policies exist; admins can read them.

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) <= 254),
  lang text not null default 'en' check (lang in ('en', 'fr')),
  source_page text check (char_length(source_page) <= 200),
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table gift_card_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 120),
  contact text not null check (char_length(contact) <= 200),
  amount text not null check (char_length(amount) <= 40),
  recipient text check (char_length(recipient) <= 200),
  message text check (char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'paid', 'delivered', 'cancelled')),
  created_at timestamptz not null default now()
);

create table job_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 120),
  contact text not null check (char_length(contact) <= 200),
  availability text check (char_length(availability) <= 80),
  experience text check (char_length(experience) <= 80),
  message text check (char_length(message) <= 4000),
  status text not null default 'new' check (status in ('new', 'contacted', 'hired', 'rejected')),
  created_at timestamptz not null default now()
);

-- Per-IP submission log so the public endpoint can't be used to fire off
-- unlimited emails. The IP is stored hashed, never raw.
create table form_submission_log (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  form text not null,
  created_at timestamptz not null default now()
);
create index form_submission_log_ip_idx on form_submission_log (ip_hash, created_at desc);

alter table newsletter_subscribers enable row level security;
alter table gift_card_requests enable row level security;
alter table job_applications enable row level security;
alter table form_submission_log enable row level security;

create policy "admins can read newsletter subscribers"
  on newsletter_subscribers for select to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can read gift card requests"
  on gift_card_requests for select to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can update gift card requests"
  on gift_card_requests for update to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can read job applications"
  on job_applications for select to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can update job applications"
  on job_applications for update to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
