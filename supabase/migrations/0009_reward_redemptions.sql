-- Reward redemptions: makes redeeming a reward actually put the item in
-- the cart for free, instead of just silently deducting points with no
-- connection to an order. Points are deducted at redemption time; the
-- redemption is "spent" (marked used, linked to the order) only once an
-- order actually goes through with it -- create_order re-validates
-- ownership + not-already-used + matching item server-side, so a client
-- can never fabricate a free line by sending a fake redemption id.

create table reward_redemptions (
  id bigint generated always as identity primary key,
  account_id uuid not null references accounts(id),
  reward_id text not null references rewards(id),
  item_id text not null references menu_items(id),
  points_spent integer not null,
  redeemed_at timestamptz not null default now(),
  used boolean not null default false,
  order_id uuid references orders(id),
  used_at timestamptz
);

alter table reward_redemptions enable row level security;
create policy reward_redemptions_select_own on reward_redemptions for select
  using (account_id = auth.uid() or is_staff());
revoke insert, update, delete on reward_redemptions from authenticated, anon;

create or replace function redeem_reward(p_reward_id text) returns reward_redemptions
language plpgsql security definer set search_path = public as $$
declare v_reward rewards; v_account accounts; v_redemption reward_redemptions;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_reward from rewards where id = p_reward_id and active;
  if v_reward is null then raise exception 'reward not found'; end if;
  if v_reward.item_id is null then raise exception 'reward has no linked item'; end if;

  update accounts set loyalty_points = loyalty_points - v_reward.cost
    where id = auth.uid() and loyalty_points >= v_reward.cost
    returning * into v_account;
  if v_account is null then raise exception 'not enough points'; end if;

  insert into reward_redemptions (account_id, reward_id, item_id, points_spent)
    values (auth.uid(), v_reward.id, v_reward.item_id, v_reward.cost)
    returning * into v_redemption;

  return v_redemption;
end;
$$;
grant execute on function redeem_reward(text) to authenticated;

-- lets a customer give back an unused redemption (e.g. they removed the
-- free item from their cart before checkout) without losing the points forever
create or replace function cancel_redemption(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_redemption reward_redemptions;
begin
  select * into v_redemption from reward_redemptions
    where id = p_id and account_id = auth.uid() and not used;
  if v_redemption is null then raise exception 'redemption not found or already used'; end if;

  update accounts set loyalty_points = loyalty_points + v_redemption.points_spent where id = auth.uid();
  delete from reward_redemptions where id = p_id;
end;
$$;
grant execute on function cancel_redemption(bigint) to authenticated;

-- create_order, extended: each line in p_lines may now carry a
-- "redemption_id" -- if present, the base item price is 0 (add-ons still
-- priced normally on top) and the redemption is marked used once the
-- order is created. Everything else is unchanged from migration 0002/0008.
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
  v_base_price integer;
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
  v_redemption_id bigint;
  v_redemption reward_redemptions;
  v_used_redemptions bigint[] := '{}';
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

    v_base_price := v_item.price;

    if (v_line ? 'redemption_id') and (v_line->>'redemption_id') is not null then
      v_redemption_id := (v_line->>'redemption_id')::bigint;
      select * into v_redemption from reward_redemptions
        where id = v_redemption_id and account_id = auth.uid() and not used;
      if v_redemption is null then
        raise exception 'reward redemption not found or already used';
      end if;
      if v_redemption.item_id <> v_item.id then
        raise exception 'redemption does not match this item';
      end if;
      if greatest(1, (v_line->>'qty')::integer) <> 1 then
        raise exception 'a redeemed item can only be ordered as quantity 1';
      end if;
      v_base_price := 0;
      v_used_redemptions := v_used_redemptions || v_redemption_id;
    end if;

    v_unit_price := v_base_price;
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

  if array_length(v_used_redemptions, 1) > 0 then
    update reward_redemptions set used = true, used_at = now(), order_id = v_order.id
      where id = any(v_used_redemptions);
  end if;

  insert into event_outbox (order_id, kind) values (v_order.id, 'created');

  return v_order;
end;
$$;
