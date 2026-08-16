-- Staff meals: during a break, an employee can order a meal from the real
-- menu with a tiered discount -- the first discounted meal of the day is
-- free, the second is 50% off, further ones are full price. This is a
-- staff benefit tracked entirely separately from payroll (a different
-- table, no link to time_entries/hours/rates), so it never affects the
-- pay calculation.
create table staff_meals (
  id bigint generated always as identity primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  item_id text not null references menu_items(id),
  item_name text not null,
  original_price integer not null,
  discount_percent integer not null check (discount_percent between 0 and 100),
  paid_price integer not null,
  ordered_by uuid references staff(id),
  created_at timestamptz not null default now()
);

alter table staff_meals enable row level security;
create policy staff_meals_select on staff_meals for select using (is_staff());
revoke insert, update, delete on staff_meals from authenticated, anon;

create or replace function order_staff_meal(p_employee_id uuid, p_item_id text) returns staff_meals
language plpgsql security definer set search_path = public as $$
declare
  v_item menu_items;
  v_open_entry_id bigint;
  v_meals_today integer;
  v_discount integer;
  v_meal staff_meals;
begin
  if not is_staff() then raise exception 'staff access required'; end if;

  select id into v_open_entry_id from time_entries where employee_id = p_employee_id and clock_out is null;
  if v_open_entry_id is null then raise exception 'employee is not clocked in'; end if;
  if not exists (select 1 from shift_breaks where time_entry_id = v_open_entry_id and break_end is null) then
    raise exception 'employee must be on break to order a meal';
  end if;

  select * into v_item from menu_items where id = p_item_id and not deleted;
  if v_item is null then raise exception 'menu item not found'; end if;
  if v_item.out_of_stock then raise exception '% is out of stock', v_item.name; end if;

  select count(*) into v_meals_today from staff_meals
    where employee_id = p_employee_id and created_at >= date_trunc('day', now());

  v_discount := case
    when v_meals_today = 0 then 100
    when v_meals_today = 1 then 50
    else 0
  end;

  insert into staff_meals (employee_id, item_id, item_name, original_price, discount_percent, paid_price, ordered_by)
  values (
    p_employee_id, v_item.id, v_item.name, v_item.price, v_discount,
    round(v_item.price * (100 - v_discount) / 100.0)::integer,
    auth.uid()
  ) returning * into v_meal;

  return v_meal;
end;
$$;
grant execute on function order_staff_meal(uuid, text) to authenticated;

alter publication supabase_realtime add table staff_meals;
