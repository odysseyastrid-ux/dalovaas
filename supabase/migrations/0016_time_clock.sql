-- Employee time clock (MVP scope: clock in/out only, ported from the
-- Inlock reference app). Employees are a lightweight roster of physical
-- staff who tap their name to badge in/out -- distinct from the `staff`
-- table, which is for people who log into this dashboard.
create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table time_entries (
  id bigint generated always as identity primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  created_at timestamptz not null default now()
);

create index time_entries_open_idx on time_entries (employee_id) where clock_out is null;
create index time_entries_employee_idx on time_entries (employee_id, clock_in desc);

alter table employees enable row level security;
create policy employees_select on employees for select using (is_staff());
create policy employees_write on employees for all using (is_manager()) with check (is_manager());
revoke insert, update, delete on employees from authenticated, anon;

alter table time_entries enable row level security;
create policy time_entries_select on time_entries for select using (is_staff());
revoke insert, update, delete on time_entries from authenticated, anon;

create or replace function add_employee(p_name text) returns employees
language plpgsql security definer set search_path = public as $$
declare v_emp employees;
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'name required'; end if;
  insert into employees (name) values (trim(p_name)) returning * into v_emp;
  return v_emp;
end;
$$;
grant execute on function add_employee(text) to authenticated;

create or replace function set_employee_active(p_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  update employees set active = p_active where id = p_id;
end;
$$;
grant execute on function set_employee_active(uuid, boolean) to authenticated;

-- clock_in / clock_out are callable by any logged-in staff member (cashier
-- or manager), since in practice whoever is at the counter taps the shared
-- device -- it isn't gated to managers like adding/removing employees is.
create or replace function clock_in(p_employee_id uuid) returns time_entries
language plpgsql security definer set search_path = public as $$
declare v_entry time_entries;
begin
  if not is_staff() then raise exception 'staff access required'; end if;
  if exists (select 1 from time_entries where employee_id = p_employee_id and clock_out is null) then
    raise exception 'already clocked in';
  end if;
  insert into time_entries (employee_id) values (p_employee_id) returning * into v_entry;
  return v_entry;
end;
$$;
grant execute on function clock_in(uuid) to authenticated;

create or replace function clock_out(p_employee_id uuid) returns time_entries
language plpgsql security definer set search_path = public as $$
declare v_entry time_entries;
begin
  if not is_staff() then raise exception 'staff access required'; end if;
  update time_entries set clock_out = now()
    where employee_id = p_employee_id and clock_out is null
    returning * into v_entry;
  if v_entry is null then raise exception 'this employee is not clocked in' ; end if;
  return v_entry;
end;
$$;
grant execute on function clock_out(uuid) to authenticated;

alter publication supabase_realtime add table employees;
alter publication supabase_realtime add table time_entries;
