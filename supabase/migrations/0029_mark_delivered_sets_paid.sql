-- Cash orders are created with paid = false (payment happens on delivery),
-- but mark_order_delivered never flipped it back to true -- so a cash
-- customer's own tracking page kept showing "Unpaid" forever, even after
-- the order was actually handed over and paid for.
create or replace function mark_order_delivered(p_ref text) returns orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  if not is_staff() then raise exception 'staff access required'; end if;

  update orders set
    status = 'done',
    order_status_index = 3,
    delivered_at = now(),
    delivered_by = auth.uid(),
    paid = true
  where ref = p_ref
  returning * into v_order;

  if v_order is null then raise exception 'order not found'; end if;

  insert into event_outbox (order_id, kind) values (v_order.id, 'delivered');
  return v_order;
end;
$$;
grant execute on function mark_order_delivered(text) to authenticated;
