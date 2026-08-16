-- Manager-only correction: delete a mistaken time entry (e.g. someone
-- forgot to clock out, or clocked in the wrong person). Cascades to any
-- shift_breaks recorded against it.
create or replace function delete_time_entry(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  delete from time_entries where id = p_id;
end;
$$;
grant execute on function delete_time_entry(bigint) to authenticated;
