-- Branding / marketing assets that the design prototype had as staff-managed
-- photo slots (logo, rotating promo banners, onboarding photos, payment
-- method icons) but the initial backend rewrite dropped. One key-value
-- table keeps this simple; every key is public-read (the customer app needs
-- it) and manager-write only.

create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

create policy app_settings_select on app_settings for select using (true);
create policy app_settings_write on app_settings for all
  using (is_manager()) with check (is_manager());

create trigger app_settings_touch before update on app_settings
  for each row execute function touch_updated_at();

create or replace function set_app_setting(p_key text, p_value jsonb) returns app_settings
language plpgsql security definer set search_path = public as $$
declare v_row app_settings;
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  insert into app_settings (key, value) values (p_key, p_value)
    on conflict (key) do update set value = excluded.value
    returning * into v_row;
  return v_row;
end;
$$;
grant execute on function set_app_setting(text, jsonb) to authenticated;

-- seed empty defaults so the frontend never has to special-case "row missing"
insert into app_settings (key, value) values
  ('logo_url', 'null'),
  ('promo_slides', '[]'),
  ('onboarding_images', '{}'),
  ('payment_icons', '{}')
on conflict (key) do nothing;
