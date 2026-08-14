-- Chez Sanji — server-authoritative order lifecycle RPCs.
-- The client never sets ref, pickup_code, prices, pending_validation,
-- order_status_index or step_deadline directly — it only calls these.

-- ---------------------------------------------------------------------------
-- create_order
-- p_lines: [{ "item_id": "b1", "qty": 2, "add_on_labels": ["Extra Cheese"], "size_label": null }]
-- Prices are always re-resolved from menu_items — a tampered client price is ignored.
-- ---------------------------------------------------------------------------
create or replace function create_order(
  p_customer_name text,
  p_customer_phone text,
  p_fulfillment order_fulfillment,
  p_delivery_address text,
  p_lines jsonb,
  p_payment_method payment_method,
  p_promo_code text default null
) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_account accounts;
  v_line jsonb;
  v_item menu_items;
  v_addon jsonb;
  v_addon_label text;
  v_unit_price integer;
  v_line_total integer;
  v_addons_out jsonb;
  v_lines_out jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_delivery_fee integer := 0;
  v_discount integer := 0;
  v_total integer;
  v_percent_off integer := 0;
  v_ref text;
  v_pickup_code text;
  v_order orders;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_account from accounts where id = auth.uid();
  if v_account is null then
    raise exception 'no account for current user';
  end if;

  if jsonb_array_length(p_lines) = 0 then
    raise exception 'cart is empty';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    select * into v_item from menu_items
      where id = (v_line->>'item_id') and not deleted;
    if v_item is null then
      raise exception 'menu item % not found', (v_line->>'item_id');
    end if;
    if v_item.out_of_stock then
      raise exception '% is out of stock', v_item.name;
    end if;

    v_unit_price := v_item.price;
    v_addons_out := '[]'::jsonb;
    if (v_line ? 'add_on_labels') then
      for v_addon_label in select jsonb_array_elements_text(v_line->'add_on_labels') loop
        select value into v_addon from jsonb_array_elements(v_item.add_ons) as value
          where value->>'label' = v_addon_label;
        if v_addon is null then
          raise exception 'add-on % not found on %', v_addon_label, v_item.name;
        end if;
        v_unit_price := v_unit_price + coalesce((v_addon->>'price')::integer, 0);
        v_addons_out := v_addons_out || jsonb_build_array(v_addon);
      end loop;
    end if;

    v_line_total := v_unit_price * greatest(1, (v_line->>'qty')::integer);
    v_subtotal := v_subtotal + v_line_total;
    v_lines_out := v_lines_out || jsonb_build_array(jsonb_build_object(
      'name', v_item.name,
      'cat', v_item.cat,
      'qty', (v_line->>'qty')::integer,
      'unitPrice', v_unit_price,
      'addOns', v_addons_out,
      'lineTotal', v_line_total
    ));
  end loop;

  if p_fulfillment = 'delivery' then
    v_delivery_fee := 1500;
    if p_delivery_address is null or length(trim(p_delivery_address)) = 0 then
      raise exception 'delivery address required';
    end if;
  end if;

  if p_promo_code is not null then
    select percent_off into v_percent_off from promo_codes
      where code = upper(p_promo_code) and active;
    if v_percent_off is not null then
      v_discount := round(v_subtotal * v_percent_off / 100.0);
    else
      p_promo_code := null;
    end if;
  end if;

  v_total := greatest(0, v_subtotal + v_delivery_fee - v_discount);
  v_ref := 'CSJ-' || floor(1000 + random() * 9000)::int;
  v_pickup_code := floor(2000 + random() * 8000)::int::text;

  -- extremely unlikely, but keep ref globally unique
  while exists (select 1 from orders where ref = v_ref) loop
    v_ref := 'CSJ-' || floor(1000 + random() * 9000)::int;
  end loop;

  insert into orders (
    ref, pickup_code, customer_id, customer_name, customer_phone,
    fulfillment, delivery_address, lines, subtotal, delivery_fee, discount, total,
    promo_code, payment_method, paid, pending_validation, status, order_status_index
  ) values (
    v_ref, v_pickup_code, auth.uid(), p_customer_name, p_customer_phone,
    p_fulfillment, p_delivery_address, v_lines_out, v_subtotal, v_delivery_fee, v_discount, v_total,
    p_promo_code, p_payment_method, (p_payment_method <> 'cash'), true, 'active', 0
  ) returning * into v_order;

  update accounts set loyalty_points = loyalty_points + round((v_subtotal / 1500.0) * 25)
    where id = auth.uid();

  insert into event_outbox (order_id, kind) values (v_order.id, 'created');

  return v_order;
end;
$$;

grant execute on function create_order(text, text, order_fulfillment, text, jsonb, payment_method, text) to authenticated;

-- ---------------------------------------------------------------------------
-- attach_payment_proof — customer uploads a receipt for a non-cash order
-- ---------------------------------------------------------------------------
create or replace function attach_payment_proof(p_ref text, p_proof_url text) returns orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  update orders set payment_proof_url = p_proof_url
    where ref = p_ref and customer_id = auth.uid()
    returning * into v_order;
  if v_order is null then raise exception 'order not found'; end if;
  return v_order;
end;
$$;
grant execute on function attach_payment_proof(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- share_order_location
-- ---------------------------------------------------------------------------
create or replace function share_order_location(p_ref text, p_lat double precision, p_lng double precision) returns orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  update orders set location = jsonb_build_object('lat', p_lat, 'lng', p_lng)
    where ref = p_ref and customer_id = auth.uid()
    returning * into v_order;
  if v_order is null then raise exception 'order not found'; end if;
  return v_order;
end;
$$;
grant execute on function share_order_location(text, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- validate_order_payment — staff only (cashier or manager)
-- ---------------------------------------------------------------------------
create or replace function validate_order_payment(p_ref text) returns orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  if not is_staff() then raise exception 'staff access required'; end if;

  update orders set
    pending_validation = false,
    validated_at = now(),
    validated_by = auth.uid(),
    order_status_index = 1,
    step_deadline = now() + interval '7 minutes'
  where ref = p_ref and status = 'active'
  returning * into v_order;

  if v_order is null then raise exception 'order not found or already closed'; end if;

  insert into event_outbox (order_id, kind) values (v_order.id, 'validated');
  return v_order;
end;
$$;
grant execute on function validate_order_payment(text) to authenticated;

-- ---------------------------------------------------------------------------
-- mark_order_delivered — staff only
-- ---------------------------------------------------------------------------
create or replace function mark_order_delivered(p_ref text) returns orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  if not is_staff() then raise exception 'staff access required'; end if;

  update orders set
    status = 'done',
    order_status_index = 3,
    delivered_at = now(),
    delivered_by = auth.uid()
  where ref = p_ref
  returning * into v_order;

  if v_order is null then raise exception 'order not found'; end if;

  insert into event_outbox (order_id, kind) values (v_order.id, 'delivered');
  return v_order;
end;
$$;
grant execute on function mark_order_delivered(text) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_order — manager only (matches the prototype's "Delete order" admin action)
-- ---------------------------------------------------------------------------
create or replace function delete_order(p_ref text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  delete from orders where ref = p_ref;
end;
$$;
grant execute on function delete_order(text) to authenticated;

-- ---------------------------------------------------------------------------
-- advance_expired_orders — flips Preparing(1) -> Ready(2) once step_deadline
-- passes. Called on a schedule (pg_cron or a scheduled Edge Function), never
-- from the client. Replaces the prototype's client-side setInterval, which
-- silently stopped working whenever the tab wasn't open.
-- ---------------------------------------------------------------------------
create or replace function advance_expired_orders() returns setof orders
language plpgsql security definer set search_path = public as $$
begin
  return query
    update orders set
      order_status_index = 2,
      ready_at = now(),
      step_deadline = null
    where status = 'active'
      and order_status_index = 1
      and step_deadline is not null
      and step_deadline <= now()
    returning *;
end;
$$;

-- fire event_outbox rows for orders that just became ready, via a small
-- wrapper so the cron job stays a single call
create or replace function run_order_status_cron() returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer := 0; v_row orders;
begin
  for v_row in select * from advance_expired_orders() loop
    insert into event_outbox (order_id, kind) values (v_row.id, 'ready');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- schedule it every minute if pg_cron is available on this project
-- (Supabase: Database > Extensions > pg_cron). Safe to re-run.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('advance-order-status', '* * * * *', 'select run_order_status_cron();');
  end if;
exception when others then
  raise notice 'pg_cron not available — schedule run_order_status_cron() via a Scheduled Edge Function instead (see docs/SETUP.md)';
end $$;

-- ---------------------------------------------------------------------------
-- redeem_reward
-- ---------------------------------------------------------------------------
create or replace function redeem_reward(p_reward_id text) returns accounts
language plpgsql security definer set search_path = public as $$
declare v_reward rewards; v_account accounts;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_reward from rewards where id = p_reward_id and active;
  if v_reward is null then raise exception 'reward not found'; end if;

  update accounts set loyalty_points = loyalty_points - v_reward.cost
    where id = auth.uid() and loyalty_points >= v_reward.cost
    returning * into v_account;

  if v_account is null then raise exception 'not enough points'; end if;
  return v_account;
end;
$$;
grant execute on function redeem_reward(text) to authenticated;

-- ---------------------------------------------------------------------------
-- upsert_menu_item / set_menu_item_stock / soft_delete_menu_item — manager only
-- ---------------------------------------------------------------------------
create or replace function upsert_menu_item(
  p_id text, p_cat menu_category, p_name text, p_name_fr text,
  p_description text, p_description_fr text, p_price integer,
  p_add_ons jsonb, p_sizes jsonb
) returns menu_items
language plpgsql security definer set search_path = public as $$
declare v_item menu_items;
begin
  if not is_manager() then raise exception 'manager access required'; end if;

  if p_id is null then
    insert into menu_items (cat, name, name_fr, description, description_fr, price, add_ons, sizes)
      values (p_cat, p_name, p_name_fr, coalesce(p_description, ''), coalesce(p_description_fr, ''), p_price,
              coalesce(p_add_ons, '[]'::jsonb), coalesce(p_sizes, '[]'::jsonb))
      returning * into v_item;
  else
    update menu_items set
      cat = p_cat, name = p_name, name_fr = p_name_fr,
      description = coalesce(p_description, description), description_fr = coalesce(p_description_fr, description_fr),
      price = p_price, add_ons = coalesce(p_add_ons, add_ons), sizes = coalesce(p_sizes, sizes)
      where id = p_id returning * into v_item;
    if v_item is null then raise exception 'menu item not found'; end if;
  end if;
  return v_item;
end;
$$;
grant execute on function upsert_menu_item(text, menu_category, text, text, text, text, integer, jsonb, jsonb) to authenticated;

create or replace function set_menu_item_stock(p_id text, p_out_of_stock boolean) returns menu_items
language plpgsql security definer set search_path = public as $$
declare v_item menu_items;
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  update menu_items set out_of_stock = p_out_of_stock where id = p_id returning * into v_item;
  if v_item is null then raise exception 'menu item not found'; end if;
  return v_item;
end;
$$;
grant execute on function set_menu_item_stock(text, boolean) to authenticated;

create or replace function soft_delete_menu_item(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  update menu_items set deleted = true where id = p_id;
end;
$$;
grant execute on function soft_delete_menu_item(text) to authenticated;
