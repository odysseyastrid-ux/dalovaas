-- The `accounts` table requires a unique, non-empty phone. handle_new_customer()
-- unconditionally inserted a row for every new auth.users row, including
-- email-only staff/manager accounts (new.phone is empty for those) — so the
-- first email-based account worked, but any second one collided on the
-- empty-string phone and auth.admin.createUser failed with a generic
-- "Database error creating new user". Staff accounts don't need an accounts
-- row at all (that table is customer loyalty data), so only insert when a
-- real phone is present.
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
