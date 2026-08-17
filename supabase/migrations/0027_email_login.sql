-- Customer login moves from phone+OTP (relayed manually over WhatsApp,
-- since no SMS provider is configured) to email+OTP, now that real email
-- delivery works via the Resend SMTP setup. Phone is no longer the account
-- identity -- it's still collected fresh at each checkout for order
-- contact, but on the account itself it becomes a regular editable field.
alter table accounts add column email text unique;
alter table accounts alter column phone drop not null;
alter table accounts alter column phone drop default;
alter table accounts drop constraint if exists accounts_phone_key;

-- Staff invites (create-staff edge function, via inviteUserByEmail) also
-- create an auth.users row and pass role/name through user metadata --
-- skip those here so they get a `staff` row only, not a spurious
-- `accounts` row too.
create or replace function handle_new_customer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data ? 'role' then
    return new;
  end if;
  insert into accounts (id, phone, email)
  values (new.id, nullif(new.phone, ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Phone is now just a regular profile field (default for checkout), not
-- tied to login -- let the customer edit it themselves.
grant update (phone) on accounts to authenticated;
