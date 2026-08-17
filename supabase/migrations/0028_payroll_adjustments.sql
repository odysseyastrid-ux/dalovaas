-- Manual payroll correction: when the time-clock wasn't used properly by
-- staff during a shift (clock-in missed, device issue, etc.), the manager
-- needs to be able to override the computed hours for an employee's
-- current pay period directly, rather than the payslip being wrong.
-- Scoped per (employee, period_start) so it naturally stops applying once
-- resetHours() starts a new period.
create table payroll_adjustments (
  id bigint generated always as identity primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  period_start timestamptz not null,
  hours_override numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, period_start)
);

alter table payroll_adjustments enable row level security;
create policy payroll_adjustments_select on payroll_adjustments for select using (is_staff());
create policy payroll_adjustments_write on payroll_adjustments for all using (is_manager()) with check (is_manager());
revoke insert, update, delete on payroll_adjustments from authenticated, anon;

create or replace function set_payroll_adjustment(
  p_employee_id uuid,
  p_period_start timestamptz,
  p_hours_override numeric,
  p_note text default null
) returns payroll_adjustments
language plpgsql security definer set search_path = public as $$
declare v_row payroll_adjustments;
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  insert into payroll_adjustments (employee_id, period_start, hours_override, note)
  values (p_employee_id, p_period_start, p_hours_override, p_note)
  on conflict (employee_id, period_start)
  do update set hours_override = excluded.hours_override, note = excluded.note, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
grant execute on function set_payroll_adjustment(uuid, timestamptz, numeric, text) to authenticated;

create or replace function clear_payroll_adjustment(p_employee_id uuid, p_period_start timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  delete from payroll_adjustments where employee_id = p_employee_id and period_start = p_period_start;
end;
$$;
grant execute on function clear_payroll_adjustment(uuid, timestamptz) to authenticated;

alter publication supabase_realtime add table payroll_adjustments;
