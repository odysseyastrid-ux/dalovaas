-- Customer safety: a courier who can pick up food and show up at someone's
-- door needs to be identifiable, not just a phone number and a first name.
-- Add the identity fields real delivery apps collect (address, national ID
-- number, vehicle plate, emergency contact) and a verified gate an admin
-- must clear before that courier can actually claim deliveries.

alter table mk_couriers
  add column address text not null default '',
  add column id_number text not null default '',
  add column plate_number text not null default '',
  add column emergency_contact_phone text not null default '',
  add column verified boolean not null default false,
  add column verified_at timestamptz;

grant update (full_name, phone, vehicle_type, city, address, id_number, plate_number, emergency_contact_phone, status)
  on mk_couriers to authenticated;

-- ---------------------------------------------------------------------------
-- mk_register_courier — now collects the identity fields above. New
-- signature (identity changes with the added params), so drop the old one
-- first, same reasoning as every other RPC change in this schema.
-- ---------------------------------------------------------------------------
drop function if exists mk_register_courier(text, text, mk_vehicle_type, text);

create or replace function mk_register_courier(
  p_full_name text,
  p_phone text,
  p_vehicle_type mk_vehicle_type,
  p_city text,
  p_address text default '',
  p_id_number text default '',
  p_plate_number text default '',
  p_emergency_contact_phone text default ''
) returns mk_couriers
language plpgsql security definer set search_path = public as $$
declare v_courier mk_couriers;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if length(trim(p_full_name)) = 0 then raise exception 'name required'; end if;
  if length(trim(p_address)) = 0 then raise exception 'address required'; end if;
  if length(trim(p_id_number)) = 0 then raise exception 'id number required'; end if;

  insert into mk_couriers (id, full_name, phone, vehicle_type, city, address, id_number, plate_number, emergency_contact_phone, status, verified)
  values (auth.uid(), p_full_name, p_phone, p_vehicle_type, p_city, p_address, p_id_number, p_plate_number, p_emergency_contact_phone, 'offline', false)
  on conflict (id) do update set
    full_name = excluded.full_name, phone = excluded.phone, vehicle_type = excluded.vehicle_type, city = excluded.city,
    address = excluded.address, id_number = excluded.id_number, plate_number = excluded.plate_number,
    emergency_contact_phone = excluded.emergency_contact_phone
  returning * into v_courier;

  return v_courier;
end;
$$;
grant execute on function mk_register_courier(text, text, mk_vehicle_type, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_admin_verify_courier — admin confirms the courier's identity before
-- they're allowed to actually pick up orders.
-- ---------------------------------------------------------------------------
create or replace function mk_admin_verify_courier(p_courier_id uuid, p_verified boolean) returns mk_couriers
language plpgsql security definer set search_path = public as $$
declare v_courier mk_couriers;
begin
  if not mk_is_admin() then raise exception 'admin access required'; end if;
  update mk_couriers set verified = p_verified, verified_at = case when p_verified then now() else null end
  where id = p_courier_id
  returning * into v_courier;
  if v_courier is null then raise exception 'courier not found'; end if;
  return v_courier;
end;
$$;
grant execute on function mk_admin_verify_courier(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_courier_claim_order — now also requires a verified courier, so an
-- unverified signup can browse the app but can't actually show up at a
-- customer's door with their food.
-- ---------------------------------------------------------------------------
create or replace function mk_courier_claim_order(p_order_id uuid) returns mk_orders
language plpgsql security definer set search_path = public as $$
declare
  v_courier mk_couriers;
  v_order mk_orders;
begin
  select * into v_courier from mk_couriers where id = auth.uid() and active;
  if v_courier is null then raise exception 'courier account required'; end if;
  if not v_courier.verified then raise exception 'votre compte est en attente de vérification'; end if;

  update mk_orders set
    courier_id = auth.uid(),
    courier_name = v_courier.full_name,
    courier_phone = v_courier.phone,
    status = 'picked_up',
    picked_up_at = now()
  where id = p_order_id and status = 'ready_for_pickup' and courier_id is null
  returning * into v_order;

  if v_order is null then raise exception 'order already claimed or not ready'; end if;

  update mk_couriers set status = 'on_delivery' where id = auth.uid();
  return v_order;
end;
$$;
grant execute on function mk_courier_claim_order(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Editing your own verified identity fields un-verifies you again — a
-- courier can't just change their ID number or plate after approval and
-- keep the badge. Re-registering (mk_register_courier, above) already goes
-- through insert...on conflict, which this trigger also covers.
-- ---------------------------------------------------------------------------
create or replace function mk_courier_unverify_on_identity_change() returns trigger
language plpgsql as $$
begin
  if new.verified and (
    new.full_name is distinct from old.full_name
    or new.id_number is distinct from old.id_number
    or new.plate_number is distinct from old.plate_number
  ) then
    new.verified := false;
    new.verified_at := null;
  end if;
  return new;
end;
$$;

create trigger mk_couriers_unverify_on_identity_change
  before update on mk_couriers
  for each row execute function mk_courier_unverify_on_identity_change();
