-- Shift breaks, ported from Inlock: each employee has an allowance (count
-- + duration), and an active shift can be paused into "on break" and
-- resumed, tracked separately from clock_in/clock_out so payroll can
-- subtract unpaid break time from worked hours.
alter table employees add column max_breaks integer not null default 2 check (max_breaks >= 0);
alter table employees add column break_minutes integer not null default 30 check (break_minutes >= 0);

create table shift_breaks (
  id bigint generated always as identity primary key,
  time_entry_id bigint not null references time_entries(id) on delete cascade,
  break_start timestamptz not null default now(),
  break_end timestamptz,
  created_at timestamptz not null default now()
);

create index shift_breaks_open_idx on shift_breaks (time_entry_id) where break_end is null;

alter table shift_breaks enable row level security;
create policy shift_breaks_select on shift_breaks for select using (is_staff());
revoke insert, update, delete on shift_breaks from authenticated, anon;
alter publication supabase_realtime add table shift_breaks;

drop function if exists add_employee(text, text);

create or replace function add_employee(
  p_name text,
  p_category text default 'service',
  p_max_breaks integer default 2,
  p_break_minutes integer default 30
) returns employees
language plpgsql security definer set search_path = public as $$
declare v_emp employees;
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'name required'; end if;
  insert into employees (name, category, max_breaks, break_minutes)
    values (trim(p_name), p_category, p_max_breaks, p_break_minutes)
    returning * into v_emp;
  return v_emp;
end;
$$;
grant execute on function add_employee(text, text, integer, integer) to authenticated;

create or replace function set_employee_breaks(p_id uuid, p_max_breaks integer, p_break_minutes integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  update employees set max_breaks = p_max_breaks, break_minutes = p_break_minutes where id = p_id;
end;
$$;
grant execute on function set_employee_breaks(uuid, integer, integer) to authenticated;

-- start_break / end_break operate on the employee's currently open shift.
-- A shift already on break can't be double-paused, can't exceed the
-- employee's break allowance, and (mirroring Inlock) the shift can't be
-- ended while on break -- end_break first.
create or replace function start_break(p_employee_id uuid) returns shift_breaks
language plpgsql security definer set search_path = public as $$
declare
  v_open_entry time_entries;
  v_employee employees;
  v_break shift_breaks;
  v_breaks_used integer;
begin
  if not is_staff() then raise exception 'staff access required'; end if;

  select * into v_open_entry from time_entries where employee_id = p_employee_id and clock_out is null;
  if v_open_entry is null then raise exception 'not clocked in'; end if;

  if exists (select 1 from shift_breaks where time_entry_id = v_open_entry.id and break_end is null) then
    raise exception 'already on break';
  end if;

  select * into v_employee from employees where id = p_employee_id;
  select count(*) into v_breaks_used from shift_breaks where time_entry_id = v_open_entry.id;
  if v_breaks_used >= v_employee.max_breaks then
    raise exception 'no breaks remaining';
  end if;

  insert into shift_breaks (time_entry_id) values (v_open_entry.id) returning * into v_break;
  return v_break;
end;
$$;
grant execute on function start_break(uuid) to authenticated;

create or replace function end_break(p_employee_id uuid) returns shift_breaks
language plpgsql security definer set search_path = public as $$
declare
  v_open_entry time_entries;
  v_break shift_breaks;
begin
  if not is_staff() then raise exception 'staff access required'; end if;

  select * into v_open_entry from time_entries where employee_id = p_employee_id and clock_out is null;
  if v_open_entry is null then raise exception 'not clocked in'; end if;

  update shift_breaks set break_end = now()
    where time_entry_id = v_open_entry.id and break_end is null
    returning * into v_break;
  if v_break is null then raise exception 'not on break'; end if;
  return v_break;
end;
$$;
grant execute on function end_break(uuid) to authenticated;

-- clock_out now refuses to end a shift while a break is still open, and
-- the overtime-hours math subtracts unpaid break time.
create or replace function clock_out(p_employee_id uuid) returns time_entries
language plpgsql security definer set search_path = public as $$
declare
  v_entry time_entries;
  v_open_entry_id bigint;
  v_alerts_enabled boolean;
  v_threshold numeric;
  v_period_start timestamptz;
  v_week_hours numeric;
begin
  if not is_staff() then raise exception 'staff access required'; end if;

  select id into v_open_entry_id from time_entries where employee_id = p_employee_id and clock_out is null;
  if v_open_entry_id is null then raise exception 'this employee is not clocked in'; end if;
  if exists (select 1 from shift_breaks where time_entry_id = v_open_entry_id and break_end is null) then
    raise exception 'end the break before ending the shift';
  end if;

  update time_entries set clock_out = now() where id = v_open_entry_id returning * into v_entry;

  select (value #>> '{}')::boolean into v_alerts_enabled from app_settings where key = 'overtime_alerts_enabled';
  if coalesce(v_alerts_enabled, false) then
    select coalesce((value #>> '{}')::numeric, 40) into v_threshold from app_settings where key = 'overtime_threshold_hours';
    select coalesce((value #>> '{}')::timestamptz, date_trunc('week', now())) into v_period_start
      from app_settings where key = 'payroll_period_start';

    select coalesce(sum(
      extract(epoch from (coalesce(te.clock_out, now()) - te.clock_in)) / 3600.0
      - coalesce((
          select sum(extract(epoch from (coalesce(sb.break_end, now()) - sb.break_start))) / 3600.0
          from shift_breaks sb where sb.time_entry_id = te.id
        ), 0)
    ), 0) into v_week_hours
      from time_entries te where te.employee_id = p_employee_id and te.clock_in >= v_period_start;

    if v_week_hours > v_threshold and not exists (
      select 1 from overtime_requests
      where employee_id = p_employee_id and auto = true and status = 'pending' and created_at >= v_period_start
    ) then
      insert into overtime_requests (employee_id, hours, note, status, auto)
      values (p_employee_id, round(v_week_hours, 1), 'Seuil dépassé (' || v_threshold || 'h)', 'pending', true);
    end if;
  end if;

  return v_entry;
end;
$$;
grant execute on function clock_out(uuid) to authenticated;
