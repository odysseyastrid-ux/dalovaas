-- delete_order used to hard-delete the row, which also erased it from the
-- customer's own order history since both staff and customer views read
-- the same orders table. Soft-delete instead: staff no longer sees it,
-- but the customer's history/receipt is untouched.
alter table orders add column deleted boolean not null default false;

create or replace function delete_order(p_ref text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  update orders set deleted = true where ref = p_ref;
end;
$$;
grant execute on function delete_order(text) to authenticated;
