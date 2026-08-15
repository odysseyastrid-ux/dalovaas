-- Staff must be able to check the customer's payment proof before
-- validating a non-cash order -- enforce it server-side too, not just in
-- the checkout UI, so it can't be bypassed by calling the RPC directly.

create or replace function validate_order_payment(p_ref text) returns orders
language plpgsql security definer set search_path = public as $$
declare v_order orders;
begin
  if not is_staff() then raise exception 'staff access required'; end if;

  select * into v_order from orders where ref = p_ref and status = 'active';
  if v_order is null then raise exception 'order not found or already closed'; end if;
  if v_order.payment_method <> 'cash' and v_order.payment_proof_url is null then
    raise exception 'cannot validate: no payment proof attached to this order';
  end if;

  update orders set
    pending_validation = false,
    validated_at = now(),
    validated_by = auth.uid(),
    order_status_index = 1,
    step_deadline = now() + interval '7 minutes'
  where ref = p_ref
  returning * into v_order;

  insert into event_outbox (order_id, kind) values (v_order.id, 'validated');
  return v_order;
end;
$$;
