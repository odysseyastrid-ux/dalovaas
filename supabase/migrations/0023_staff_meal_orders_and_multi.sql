-- Staff meals now also create a real, visible order (so kitchen sees and
-- prepares them like anything else), and an employee can pick several
-- items in one go. The discount tier is still per meal in sequence: the
-- first discounted meal of the day is free, the second is 50% off, the
-- rest are full price -- applied line by line within the same batch.
-- staff_meals itself is untouched (still the source for the Repas panel
-- and the daily discount tally); this just also books an orders row.
alter table orders alter column customer_id drop not null;
alter table orders add column is_staff_meal boolean not null default false;

drop function if exists order_staff_meal(uuid, text);

create or replace function order_staff_meal(p_employee_id uuid, p_item_ids text[]) returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_employee employees;
  v_open_entry_id bigint;
  v_item menu_items;
  v_item_id text;
  v_meals_today integer;
  v_discount integer;
  v_unit_price integer;
  v_lines_out jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_ref text;
  v_pickup_code text;
  v_order orders;
begin
  if not is_staff() then raise exception 'staff access required'; end if;
  if p_item_ids is null or array_length(p_item_ids, 1) is null then raise exception 'no items selected'; end if;

  select * into v_employee from employees where id = p_employee_id;
  if v_employee is null then raise exception 'employee not found'; end if;

  select id into v_open_entry_id from time_entries where employee_id = p_employee_id and clock_out is null;
  if v_open_entry_id is null then raise exception 'employee is not clocked in'; end if;
  if not exists (select 1 from shift_breaks where time_entry_id = v_open_entry_id and break_end is null) then
    raise exception 'employee must be on break to order a meal';
  end if;

  select count(*) into v_meals_today from staff_meals
    where employee_id = p_employee_id and created_at >= date_trunc('day', now());

  foreach v_item_id in array p_item_ids loop
    select * into v_item from menu_items where id = v_item_id and not deleted;
    if v_item is null then raise exception 'menu item not found'; end if;
    if v_item.out_of_stock then raise exception '% is out of stock', v_item.name; end if;

    v_discount := case
      when v_meals_today = 0 then 100
      when v_meals_today = 1 then 50
      else 0
    end;
    v_unit_price := round(v_item.price * (100 - v_discount) / 100.0)::integer;

    v_lines_out := v_lines_out || jsonb_build_array(jsonb_build_object(
      'name', v_item.name || case when v_discount > 0 then format(' (-%s%%)', v_discount) else '' end,
      'cat', v_item.cat,
      'qty', 1,
      'unitPrice', v_unit_price,
      'addOns', '[]'::jsonb,
      'lineTotal', v_unit_price
    ));
    v_subtotal := v_subtotal + v_unit_price;

    insert into staff_meals (employee_id, item_id, item_name, original_price, discount_percent, paid_price, ordered_by)
    values (p_employee_id, v_item.id, v_item.name, v_item.price, v_discount, v_unit_price, auth.uid());

    v_meals_today := v_meals_today + 1;
  end loop;

  v_ref := 'CSJ-' || floor(1000 + random() * 9000)::int;
  v_pickup_code := floor(2000 + random() * 8000)::int::text;
  while exists (select 1 from orders where ref = v_ref) loop
    v_ref := 'CSJ-' || floor(1000 + random() * 9000)::int;
  end loop;

  insert into orders (
    ref, pickup_code, customer_id, customer_name, customer_phone,
    fulfillment, delivery_address, lines, subtotal, delivery_fee, discount, donation_amount, total,
    payment_method, paid, pending_validation, status, order_status_index,
    validated_at, step_deadline, is_staff_meal
  ) values (
    v_ref, v_pickup_code, null, '🍽️ ' || v_employee.name || ' (Staff)', '',
    'pickup', null, v_lines_out, v_subtotal, 0, 0, 0, v_subtotal,
    'cash', true, false, 'active', 1,
    now(), now() + interval '7 minutes', true
  ) returning * into v_order;

  return v_order;
end;
$$;
grant execute on function order_staff_meal(uuid, text[]) to authenticated;
