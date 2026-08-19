-- Cameroon-style delivery options: Priorité (flat, distance-tiered),
-- Standard (calculated fare, met at the nearest carrefour instead of
-- door-to-door), Planifier (customer picks the time + meeting place, same
-- calculated fare as Standard). Distance is computed server-side from the
-- vendor's and the customer's coordinates (haversine) — never trusted from
-- the client — so delivery pricing can't be tampered with any more than
-- item prices can. Also brings back Chez Sanji's round-up-for-charity.

create type mk_delivery_option as enum ('priority', 'standard', 'scheduled');

alter table mk_orders
  add column delivery_option mk_delivery_option not null default 'standard',
  add column scheduled_at timestamptz,
  add column meeting_point text,
  add column donation_amount integer not null default 0 check (donation_amount >= 0),
  add column distance_km numeric(6,2);

-- Adding parameters changes the function's identity in Postgres's catalog,
-- so create-or-replace alone would leave the old 9-arg version sitting
-- alongside this one and create an ambiguous-call error over PostgREST.
drop function if exists mk_create_order(uuid, jsonb, text, double precision, double precision, mk_payment_method, text, text, text);

create or replace function mk_create_order(
  p_vendor_id uuid,
  p_items jsonb,
  p_delivery_address text,
  p_delivery_lat double precision,
  p_delivery_lng double precision,
  p_payment_method mk_payment_method,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_option mk_delivery_option default 'standard',
  p_scheduled_at timestamptz default null,
  p_meeting_point text default null,
  p_round_up_donation boolean default false,
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
  v_delivery_fee integer;
  v_commission integer;
  v_pre_donation_total integer;
  v_donation integer := 0;
  v_total integer;
  v_ref text;
  v_distance_km numeric(6,2);
  v_order mk_orders;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'cart is empty'; end if;
  if p_delivery_address is null or length(trim(p_delivery_address)) = 0 then
    raise exception 'delivery address required';
  end if;

  select * into v_vendor from mk_vendors where id = p_vendor_id and status = 'active';
  if v_vendor is null then raise exception 'vendor not found or inactive'; end if;

  if p_delivery_option = 'scheduled' then
    if p_scheduled_at is null or p_scheduled_at <= now() then
      raise exception 'choisissez une date et une heure valides dans le futur';
    end if;
    if p_meeting_point is null or length(trim(p_meeting_point)) = 0 then
      raise exception 'précisez le lieu de rendez-vous';
    end if;
  end if;

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

  -- Haversine distance in km, only when both endpoints are known. Unknown
  -- distance falls back to a conservative 6km so Priorité still lands on
  -- its higher tier and Standard/Planifier still get a sane calculated fare
  -- instead of failing the order outright.
  if v_vendor.lat is not null and v_vendor.lng is not null and p_delivery_lat is not null and p_delivery_lng is not null then
    v_distance_km := (6371 * acos(least(1::double precision, greatest(-1::double precision,
      cos(radians(v_vendor.lat)) * cos(radians(p_delivery_lat)) * cos(radians(p_delivery_lng) - radians(v_vendor.lng))
      + sin(radians(v_vendor.lat)) * sin(radians(p_delivery_lat))
    ))))::numeric(6,2);
  else
    v_distance_km := null;
  end if;

  if p_delivery_option = 'priority' then
    v_delivery_fee := case when coalesce(v_distance_km, 6) <= 5 then 1000 else 2000 end;
  else
    -- Standard / Planifier: calculated fare, cheaper than Priorité at short
    -- range since the rider meets the customer at a carrefour instead of
    -- navigating to the door. Rounded to the nearest 50 FCFA, clamped.
    v_delivery_fee := greatest(500, least(1800, (round((300 + coalesce(v_distance_km, 6) * 120) / 50) * 50)::integer));
  end if;

  v_commission := round(v_subtotal * v_vendor.commission_rate);
  v_pre_donation_total := v_subtotal + v_delivery_fee;

  if p_round_up_donation and v_pre_donation_total > 0 then
    v_donation := (ceil(v_pre_donation_total / 100.0) * 100)::integer - v_pre_donation_total;
  end if;

  v_total := v_pre_donation_total + v_donation;

  v_ref := 'DLV-' || floor(1000 + random() * 9000)::int;
  while exists (select 1 from mk_orders where ref = v_ref) loop
    v_ref := 'DLV-' || floor(1000 + random() * 9000)::int;
  end loop;

  insert into mk_orders (
    ref, customer_id, customer_name, customer_phone, vendor_id, vendor_name,
    items, subtotal, delivery_fee, commission_amount, donation_amount, total,
    delivery_address, delivery_lat, delivery_lng, delivery_option, scheduled_at, meeting_point, distance_km,
    payment_method, paid, notes, status
  ) values (
    v_ref, auth.uid(), p_customer_name, p_customer_phone, p_vendor_id, v_vendor.name,
    v_items_out, v_subtotal, v_delivery_fee, v_commission, v_donation, v_total,
    p_delivery_address, p_delivery_lat, p_delivery_lng, p_delivery_option, p_scheduled_at, p_meeting_point, v_distance_km,
    p_payment_method, (p_payment_method <> 'cash'), p_notes, 'pending'
  ) returning * into v_order;

  return v_order;
end;
$$;
grant execute on function mk_create_order(uuid, jsonb, text, double precision, double precision, mk_payment_method, text, text, mk_delivery_option, timestamptz, text, boolean, text) to authenticated;
