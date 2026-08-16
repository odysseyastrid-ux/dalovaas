-- Customer profile photo. Column-level grants are additive in Postgres, so
-- this extends the existing "customers can update their own profile
-- fields" grant from 0001_init.sql without touching the rest of it.
alter table accounts add column avatar_url text;
grant update (avatar_url) on accounts to authenticated;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "anyone reads avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "customers upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "customers update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "customers delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
