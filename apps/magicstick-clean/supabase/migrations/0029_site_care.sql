-- Dashboard "Entretien du site" (Nov 16, 2026).
--
-- site_settings: what the bar at the top of every page says, editable by the
-- owner without code. A notice (e.g. holiday closure) wins over the promo; an
-- empty text means "use the site's default wording". Public read (every page
-- reads it), admin write (the admin_users sub-query, so aal2 only, 0027).
create table if not exists site_settings (
  id text primary key default 'main' check (id = 'main'),
  promo_enabled boolean not null default true,
  promo_text_fr text check (char_length(promo_text_fr) <= 160),
  promo_text_en text check (char_length(promo_text_en) <= 160),
  notice_enabled boolean not null default false,
  notice_fr text check (char_length(notice_fr) <= 200),
  notice_en text check (char_length(notice_en) <= 200),
  notice_until date,
  updated_at timestamptz not null default now()
);
insert into site_settings (id) values ('main') on conflict do nothing;
alter table site_settings enable row level security;
create policy "anyone can read the site settings" on site_settings for select to anon, authenticated using (true);
create policy "admins can update the site settings" on site_settings for update to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant select on site_settings to anon, authenticated;
grant update on site_settings to authenticated;

-- supplies: the owner's cleaning products and their stock, with a minimum
-- that raises a "to buy" alert on the dashboard home.
create table if not exists supplies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  unit text check (char_length(unit) <= 20),
  quantity numeric(8,1) not null default 0 check (quantity >= 0),
  min_quantity numeric(8,1) not null default 1 check (min_quantity >= 0),
  note text check (char_length(note) <= 200),
  updated_at timestamptz not null default now()
);
alter table supplies enable row level security;
create policy "admins manage supplies" on supplies for all to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant select, insert, update, delete on supplies to authenticated;
