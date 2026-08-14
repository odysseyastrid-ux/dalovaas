-- Payment-proof uploads: object storage, not inline blobs in the database.
-- Path convention: payment-proofs/{auth.uid()}/{order-ref}-{filename}
-- so a customer can only write into their own folder, and staff can read all.

insert into storage.buckets (id, name, public)
  values ('payment-proofs', 'payment-proofs', false)
  on conflict (id) do nothing;

create policy "customers upload own payment proofs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "customers read own payment proofs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "staff read all payment proofs"
  on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and is_staff());

-- product photos: public read, manager write
insert into storage.buckets (id, name, public)
  values ('menu-photos', 'menu-photos', true)
  on conflict (id) do nothing;

create policy "anyone reads menu photos"
  on storage.objects for select
  using (bucket_id = 'menu-photos');

create policy "managers write menu photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-photos' and is_manager());

create policy "managers update menu photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'menu-photos' and is_manager());

create policy "managers delete menu photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'menu-photos' and is_manager());
