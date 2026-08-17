-- handle_new_customer() ran for every new auth.users row, including
-- email-only staff invites (no phone). It inserted phone = coalesce(new.phone, '')
-- into accounts, whose phone column is unique -- the first staff/manager
-- account already occupies the '' slot, so every subsequent staff invite
-- collided on that constraint and GoTrue surfaced it as the opaque
-- "Database error creating new user". Only real phone-auth customers should
-- get an accounts row; staff members live in the staff table instead.
create or replace function handle_new_customer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.phone is not null and new.phone <> '' then
    insert into accounts (id, phone)
    values (new.id, new.phone)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;
