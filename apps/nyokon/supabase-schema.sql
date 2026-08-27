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

create policy "Public can read site images"
  on public.site_images for select
  to anon, authenticated
  using (true);

create policy "Staff can insert site images"
  on public.site_images for insert
  to authenticated
  with check (true);

create policy "Staff can update site images"
  on public.site_images for update
  to authenticated
  using (true)
  with check (true);

-- Storage bucket for the uploaded photo files themselves.
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

create policy "Public can view site-images bucket"
  on storage.objects for select
  to public
  using (bucket_id = 'site-images');

create policy "Staff can upload to site-images bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-images');

create policy "Staff can update site-images bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-images');
