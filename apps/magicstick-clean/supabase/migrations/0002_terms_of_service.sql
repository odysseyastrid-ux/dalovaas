-- terms_of_service — structured content for the /terms.html page, so the
-- Terms of Service can be edited from the database instead of hard-coded
-- HTML. Public read-only; nothing here is ever written from the client.

create table terms_of_service (
  id uuid primary key default gen_random_uuid(),
  section_number int not null,
  title text not null,
  category text not null,
  icon_name text,
  summary_tldr text not null,
  full_content text not null,
  is_critical boolean not null default false,
  display_order int not null unique,
  version text not null default '1.0.0',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index terms_category_idx on terms_of_service (category);
create index terms_critical_idx on terms_of_service (is_critical);
create index terms_order_idx on terms_of_service (display_order);

alter table terms_of_service enable row level security;

create policy "anyone can read active terms sections"
  on terms_of_service for select
  to anon, authenticated
  using (is_active);
