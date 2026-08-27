-- nyøkøn — staff photo uploads
-- Run this once in the Supabase SQL Editor (Database → SQL Editor → New query)
-- for the project this site is wired to.

create table if not exists public.site_images (
  slot text primary key,
  image_url text,
  updated_at timestamptz not null default now()
);

insert into public.site_images (slot) values
  ('hero'), ('lookbook_1'), ('lookbook_2'), ('lookbook_3'),
  ('lookbook_4'), ('lookbook_5'), ('lookbook_6')
on conflict (slot) do nothing;

alter table public.site_images enable row level security;

drop policy if exists site_images_select_public on public.site_images;
create policy site_images_select_public
  on public.site_images for select
  to anon, authenticated
  using (true);

drop policy if exists site_images_insert_staff on public.site_images;
create policy site_images_insert_staff
  on public.site_images for insert
  to authenticated
  with check (true);

drop policy if exists site_images_update_staff on public.site_images;
create policy site_images_update_staff
  on public.site_images for update
  to authenticated
  using (true)
  with check (true);

-- Storage bucket for the uploaded photo files themselves.
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

drop policy if exists site_images_bucket_select_public on storage.objects;
create policy site_images_bucket_select_public
  on storage.objects for select
  to public
  using (bucket_id = 'site-images');

drop policy if exists site_images_bucket_insert_staff on storage.objects;
create policy site_images_bucket_insert_staff
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-images');

drop policy if exists site_images_bucket_update_staff on storage.objects;
create policy site_images_bucket_update_staff
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-images');
