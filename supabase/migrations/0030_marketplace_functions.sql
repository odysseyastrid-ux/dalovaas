-- Dalovaas — server-authoritative order lifecycle + registration RPCs.
-- The client never sets prices, commission, ref, or status directly.

-- ---------------------------------------------------------------------------
-- mk_register_vendor — self-serve "become a partner" signup, lands as 'pending'
-- ---------------------------------------------------------------------------
create or replace function mk_register_vendor(
  p_name text,
  p_name_fr text,
  p_cuisine_type text,
  p_phone text,
  p_city text,
  p_address text
) returns mk_vendors
language plpgsql security definer set search_path = public as $$
declare v_vendor mk_vendors;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from mk_vendors where owner_id = auth.uid()) then
    raise exception 'you already have a vendor account';
  end if;
  if length(trim(p_name)) = 0 then raise exception 'name required'; end if;

  insert into mk_vendors (owner_id, name, name_fr, cuisine_type, phone, city, address, status)
  values (auth.uid(), p_name, coalesce(nullif(p_name_fr, ''), p_name), p_cuisine_type, p_phone, p_city, p_address, 'pending')
  returning * into v_vendor;

  return v_vendor;
end;
$$;
grant execute on function mk_register_vendor(text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_register_courier — self-serve courier signup
-- ---------------------------------------------------------------------------
create or replace function mk_register_courier(
  p_full_name text,
  p_phone text,
  p_vehicle_type mk_vehicle_type,
  p_city text
) returns mk_couriers
language plpgsql security definer set search_path = public as $$
declare v_courier mk_couriers;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if length(trim(p_full_name)) = 0 then raise exception 'name required'; end if;

  insert into mk_couriers (id, full_name, phone, vehicle_type, city, status)
  values (auth.uid(), p_full_name, p_phone, p_vehicle_type, p_city, 'offline')
  on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone,
    vehicle_type = excluded.vehicle_type, city = excluded.city
  returning * into v_courier;

  return v_courier;
end;
$$;
grant execute on function mk_register_courier(text, text, mk_vehicle_type, text) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_create_order
-- p_items: [{ "item_id": "mki_xxx", "qty": 2 }]
-- Prices are always re-resolved from mk_menu_items — a tampered client
-- price is ignored. Delivery fee is a flat rate for the MVP.
-- ---------------------------------------------------------------------------
create or replace function mk_create_order(
  p_vendor_id uuid,
  p_items jsonb,
  p_delivery_address text,
  p_delivery_lat double precision,
  p_delivery_lng double precision,
  p_payment_method mk_payment_method,
  p_customer_name text,
  p_customer_phone text,
  p_notes text default null
) returns mk_orders
language plpgsql security definer set search_path = public as $$
declare
  v_vendor mk_vendors;
  v_line jsonb;
  v_item mk_menu_items;
  v_qty integer;
  v_line_total integer;
  v_items_out jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_delivery_fee integer := 1000;
  v_commission integer;
  v_total integer;
  v_ref text;
  v_order mk_orders;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'cart is empty'; end if;
  if p_delivery_address is null or length(trim(p_delivery_address)) = 0 then
    raise exception 'delivery address required';
  end if;

  select * into v_vendor from mk_vendors where id = p_vendor_id and status = 'active';
  if v_vendor is null then raise exception 'vendor not found or inactive'; end if;

  for v_line in select * from jsonb_array_elements(p_items) loop
    select * into v_item from mk_menu_items
      where id = (v_line->>'item_id') and vendor_id = p_vendor_id and not deleted;
    if v_item is null then
      raise exception 'menu item % not found for this vendor', (v_line->>'item_id');
    end if;
    if not v_item.available then
      raise exception '% is unavailable', v_item.name;
    end if;

    v_qty := greatest(1, coalesce((v_line->>'qty')::integer, 1));
    v_line_total := v_item.price * v_qty;
    v_subtotal := v_subtotal + v_line_total;
    v_items_out := v_items_out || jsonb_build_array(jsonb_build_object(
      'item_id', v_item.id,
      'name', v_item.name,
      'unit_price', v_item.price,
      'qty', v_qty,
      'line_total', v_line_total
    ));
  end loop;

  v_commission := round(v_subtotal * v_vendor.commission_rate);
  v_total := v_subtotal + v_delivery_fee;

  v_ref := 'DLV-' || floor(1000 + random() * 9000)::int;
  while exists (select 1 from mk_orders where ref = v_ref) loop
    v_ref := 'DLV-' || floor(1000 + random() * 9000)::int;
  end loop;

  insert into mk_orders (
    ref, customer_id, customer_name, customer_phone, vendor_id, vendor_name,
    items, subtotal, delivery_fee, commission_amount, total,
    delivery_address, delivery_lat, delivery_lng, payment_method, paid, notes, status
  ) values (
    v_ref, auth.uid(), p_customer_name, p_customer_phone, p_vendor_id, v_vendor.name,
    v_items_out, v_subtotal, v_delivery_fee, v_commission, v_total,
    p_delivery_address, p_delivery_lat, p_delivery_lng, p_payment_method,
    (p_payment_method <> 'cash'), p_notes, 'pending'
  ) returning * into v_order;

  return v_order;
end;
$$;
grant execute on function mk_create_order(uuid, jsonb, text, double precision, double precision, mk_payment_method, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_vendor_accept_order
-- ---------------------------------------------------------------------------
create or replace function mk_vendor_accept_order(p_order_id uuid) returns mk_orders
language plpgsql security definer set search_path = public as $$
declare v_order mk_orders;
begin
  update mk_orders set status = 'accepted', accepted_at = now()
  where id = p_order_id and status = 'pending' and mk_owns_vendor(vendor_id)
  returning * into v_order;
  if v_order is null then raise exception 'order not found or not pending'; end if;
  return v_order;
end;
$$;
grant execute on function mk_vendor_accept_order(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_vendor_mark_ready — food is packed and waiting for a courier
-- ---------------------------------------------------------------------------
create or replace function mk_vendor_mark_ready(p_order_id uuid) returns mk_orders
language plpgsql security definer set search_path = public as $$
declare v_order mk_orders;
begin
  update mk_orders set status = 'ready_for_pickup', ready_at = now()
  where id = p_order_id and status = 'accepted' and mk_owns_vendor(vendor_id)
  returning * into v_order;
  if v_order is null then raise exception 'order not found or not accepted'; end if;
  return v_order;
end;
$$;
grant execute on function mk_vendor_mark_ready(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_courier_claim_order — an online courier claims an unassigned, ready order
-- ---------------------------------------------------------------------------
create or replace function mk_courier_claim_order(p_order_id uuid) returns mk_orders
language plpgsql security definer set search_path = public as $$
declare
  v_courier mk_couriers;
  v_order mk_orders;
begin
  select * into v_courier from mk_couriers where id = auth.uid() and active;
  if v_courier is null then raise exception 'courier account required'; end if;

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
-- mk_courier_mark_delivered
-- ---------------------------------------------------------------------------
create or replace function mk_courier_mark_delivered(p_order_id uuid) returns mk_orders
language plpgsql security definer set search_path = public as $$
declare v_order mk_orders;
begin
  update mk_orders set status = 'delivered', delivered_at = now()
  where id = p_order_id and status = 'picked_up' and courier_id = auth.uid()
  returning * into v_order;
  if v_order is null then raise exception 'order not found or not in transit'; end if;

  update mk_couriers set status = 'online' where id = auth.uid();
  return v_order;
end;
$$;
grant execute on function mk_courier_mark_delivered(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_cancel_order — customer (before accepted), vendor owner, or admin
-- ---------------------------------------------------------------------------
create or replace function mk_cancel_order(p_order_id uuid, p_reason text default null) returns mk_orders
language plpgsql security definer set search_path = public as $$
declare v_order mk_orders;
begin
  select * into v_order from mk_orders where id = p_order_id;
  if v_order is null then raise exception 'order not found'; end if;
  if v_order.status in ('delivered', 'cancelled') then
    raise exception 'order already closed';
  end if;

  if v_order.customer_id = auth.uid() and v_order.status <> 'pending' then
    raise exception 'order already in progress, ask the vendor to cancel it';
  end if;
  if not (v_order.customer_id = auth.uid() or mk_owns_vendor(v_order.vendor_id) or mk_is_admin()) then
    raise exception 'not authorized to cancel this order';
  end if;

  update mk_orders set status = 'cancelled', cancel_reason = p_reason, cancelled_at = now()
  where id = p_order_id
  returning * into v_order;

  if v_order.courier_id is not null then
    update mk_couriers set status = 'online' where id = v_order.courier_id;
  end if;

  return v_order;
end;
$$;
grant execute on function mk_cancel_order(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_admin_set_vendor_status
-- ---------------------------------------------------------------------------
create or replace function mk_admin_set_vendor_status(p_vendor_id uuid, p_status mk_vendor_status) returns mk_vendors
language plpgsql security definer set search_path = public as $$
declare v_vendor mk_vendors;
begin
  if not mk_is_admin() then raise exception 'admin access required'; end if;
  update mk_vendors set status = p_status where id = p_vendor_id returning * into v_vendor;
  if v_vendor is null then raise exception 'vendor not found'; end if;
  return v_vendor;
end;
$$;
grant execute on function mk_admin_set_vendor_status(uuid, mk_vendor_status) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_admin_set_courier_active
-- ---------------------------------------------------------------------------
create or replace function mk_admin_set_courier_active(p_courier_id uuid, p_active boolean) returns mk_couriers
language plpgsql security definer set search_path = public as $$
declare v_courier mk_couriers;
begin
  if not mk_is_admin() then raise exception 'admin access required'; end if;
  update mk_couriers set active = p_active where id = p_courier_id returning * into v_courier;
  if v_courier is null then raise exception 'courier not found'; end if;
  return v_courier;
end;
$$;
grant execute on function mk_admin_set_courier_active(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- mk_rate_order — customer rates vendor + courier after delivery
-- ---------------------------------------------------------------------------
create or replace function mk_rate_order(
  p_order_id uuid,
  p_vendor_rating smallint,
  p_courier_rating smallint default null,
  p_comment text default null
) returns mk_ratings
language plpgsql security definer set search_path = public as $$
declare
  v_order mk_orders;
  v_rating mk_ratings;
begin
  select * into v_order from mk_orders where id = p_order_id and customer_id = auth.uid();
  if v_order is null then raise exception 'order not found'; end if;
  if v_order.status <> 'delivered' then raise exception 'order not yet delivered'; end if;

  insert into mk_ratings (order_id, customer_id, vendor_id, courier_id, vendor_rating, courier_rating, comment)
  values (p_order_id, auth.uid(), v_order.vendor_id, v_order.courier_id, p_vendor_rating, p_courier_rating, p_comment)
  on conflict (order_id) do update set
    vendor_rating = excluded.vendor_rating, courier_rating = excluded.courier_rating, comment = excluded.comment
  returning * into v_rating;

  update mk_vendors set
    rating = round((((rating * rating_count) + p_vendor_rating) / (rating_count + 1))::numeric, 1),
    rating_count = rating_count + 1
  where id = v_order.vendor_id;

  if v_order.courier_id is not null and p_courier_rating is not null then
    update mk_couriers set
      rating = round((((rating * rating_count) + p_courier_rating) / (rating_count + 1))::numeric, 1),
      rating_count = rating_count + 1
    where id = v_order.courier_id;
  end if;

  return v_rating;
end;
$$;
grant execute on function mk_rate_order(uuid, smallint, smallint, text) to authenticated;
