-- Round-up-for-charity: the customer can opt, at checkout, to round their
-- total up to the nearest 100 FCFA and donate the difference. Like every
-- other price on an order, the donation is computed server-side from the
-- real total, never trusted from the client, so it can't be tampered with.
alter table orders add column donation_amount integer not null default 0 check (donation_amount >= 0);

-- Adding a parameter changes the function's identity in Postgres's catalog,
-- so create-or-replace alone would leave the old 7-arg version sitting
-- alongside this one and create an ambiguous-call error over PostgREST.
-- Drop it explicitly first.
drop function if exists create_order(text, text, order_fulfillment, text, jsonb, payment_method, text);

create or replace function create_order(
  p_customer_name text,
  p_customer_phone text,
  p_fulfillment order_fulfillment,
  p_delivery_address text,
  p_lines jsonb,
  p_payment_method payment_method,
  p_promo_code text default null,
  p_round_up_donation boolean default false
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
  v_pre_donation_total integer;
  v_donation integer := 0;
  v_total integer;
  v_percent_off integer := 0;
  v_ref text;
  v_pickup_code text;
  v_is_cash boolean;
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

  v_pre_donation_total := greatest(0, v_subtotal + v_delivery_fee - v_discount);

  if p_round_up_donation and v_pre_donation_total > 0 then
    v_donation := (ceil(v_pre_donation_total / 100.0) * 100)::integer - v_pre_donation_total;
  end if;

  v_total := v_pre_donation_total + v_donation;
  v_ref := 'CSJ-' || floor(1000 + random() * 9000)::int;
  v_pickup_code := floor(2000 + random() * 8000)::int::text;

  -- extremely unlikely, but keep ref globally unique
  while exists (select 1 from orders where ref = v_ref) loop
    v_ref := 'CSJ-' || floor(1000 + random() * 9000)::int;
  end loop;

  v_is_cash := (p_payment_method = 'cash');

  insert into orders (
    ref, pickup_code, customer_id, customer_name, customer_phone,
    fulfillment, delivery_address, lines, subtotal, delivery_fee, discount, donation_amount, total,
    promo_code, payment_method, paid, pending_validation, status, order_status_index,
    validated_at, step_deadline
  ) values (
    v_ref, v_pickup_code, auth.uid(), p_customer_name, p_customer_phone,
    p_fulfillment, p_delivery_address, v_lines_out, v_subtotal, v_delivery_fee, v_discount, v_donation, v_total,
    p_promo_code, p_payment_method, not v_is_cash, not v_is_cash, 'active',
    case when v_is_cash then 1 else 0 end,
    case when v_is_cash then now() else null end,
    case when v_is_cash then now() + interval '7 minutes' else null end
  ) returning * into v_order;

  update accounts set loyalty_points = loyalty_points + round((v_subtotal / 1500.0) * 25)
    where id = auth.uid();

  insert into event_outbox (order_id, kind) values (v_order.id, 'created');

  return v_order;
end;
$$;

grant execute on function create_order(text, text, order_fulfillment, text, jsonb, payment_method, text, boolean) to authenticated;
