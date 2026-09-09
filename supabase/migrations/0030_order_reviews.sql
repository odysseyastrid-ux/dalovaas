-- Customers can rate a delivered/picked-up order and leave an optional
-- comment. Submitting a review awards a flat loyalty-points bonus, once per
-- order, to give people a real reason to actually rate their food.
alter table orders add column rating smallint check (rating between 1 and 5);
alter table orders add column review_comment text;
alter table orders add column reviewed_at timestamptz;

create or replace function submit_order_review(p_ref text, p_rating smallint, p_comment text default null)
returns orders
language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_bonus_points constant integer := 50;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  select * into v_order from orders where ref = p_ref;
  if v_order is null then
    raise exception 'order not found';
  end if;
  if v_order.customer_id is distinct from auth.uid() then
    raise exception 'not your order';
  end if;
  if v_order.order_status_index < 3 then
    raise exception 'order not yet delivered';
  end if;
  if v_order.reviewed_at is not null then
    raise exception 'order already reviewed';
  end if;

  update orders
    set rating = p_rating, review_comment = nullif(trim(coalesce(p_comment, '')), ''), reviewed_at = now()
    where ref = p_ref
    returning * into v_order;

  update accounts set loyalty_points = loyalty_points + v_bonus_points where id = auth.uid();

  return v_order;
end;
$$;
grant execute on function submit_order_review(text, smallint, text) to authenticated;
