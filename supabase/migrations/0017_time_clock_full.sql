-- Full Inlock feature port: payroll, overtime approvals, GPS check-in,
-- manager/owner PIN gates. Settings reuse the existing app_settings +
-- set_app_setting() plumbing rather than one-off RPCs per field.

alter table employees add column category text not null default 'service'
  check (category in ('bar', 'counter', 'kitchen', 'dressing', 'service'));

alter table time_entries add column clock_in_lat double precision;
alter table time_entries add column clock_in_lng double precision;

create table overtime_requests (
  id bigint generated always as identity primary key,
  employee_id uuid not null references employees(id) on delete cascade,
  hours numeric,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  auto boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references staff(id)
);
alter table overtime_requests enable row level security;
create policy overtime_requests_select on overtime_requests for select using (is_staff());
create policy overtime_requests_write on overtime_requests for all using (is_manager()) with check (is_manager());
revoke insert, update, delete on overtime_requests from authenticated, anon;
alter publication supabase_realtime add table overtime_requests;

-- Seed default settings (reusing the app_settings key/value store).
insert into app_settings (key, value) values
  ('hourly_rates', '{"bar": 700, "counter": 700, "kitchen": 700, "dressing": 700, "service": 500}'::jsonb),
  ('payroll_period_start', to_jsonb(date_trunc('week', now())::text)),
  ('overtime_threshold_hours', '40'::jsonb),
  ('overtime_alerts_enabled', 'true'::jsonb),
  ('require_gps_checkin', 'false'::jsonb),
  ('venue_location', 'null'::jsonb),
  ('manager_pin', '"4821"'::jsonb),
  ('owner_pin', '"1910"'::jsonb),
  ('company_email', '""'::jsonb)
on conflict (key) do nothing;

-- Adding a parameter changes the function's identity in Postgres's catalog
-- (see the create_order migrations for the same issue) -- drop the old
-- 1-arg version first so PostgREST doesn't see two ambiguous candidates.
drop function if exists add_employee(text);

create or replace function add_employee(p_name text, p_category text default 'service') returns employees
language plpgsql security definer set search_path = public as $$
declare v_emp employees;
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'name required'; end if;
  insert into employees (name, category) values (trim(p_name), p_category) returning * into v_emp;
  return v_emp;
end;
$$;
grant execute on function add_employee(text, text) to authenticated;

create or replace function set_employee_category(p_id uuid, p_category text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  update employees set category = p_category where id = p_id;
end;
$$;
grant execute on function set_employee_category(uuid, text) to authenticated;

-- clock_in now optionally takes GPS coordinates and enforces an on-site
-- radius when "require_gps_checkin" is on and a venue location is set.
drop function if exists clock_in(uuid);

create or replace function clock_in(p_employee_id uuid, p_lat double precision default null, p_lng double precision default null)
returns time_entries
language plpgsql security definer set search_path = public as $$
declare
  v_entry time_entries;
  v_require_gps boolean;
  v_venue jsonb;
  v_venue_lat double precision;
  v_venue_lng double precision;
  v_dist_km double precision;
begin
  if not is_staff() then raise exception 'staff access required'; end if;
  if exists (select 1 from time_entries where employee_id = p_employee_id and clock_out is null) then
    raise exception 'already clocked in';
  end if;

  select (value #>> '{}')::boolean into v_require_gps from app_settings where key = 'require_gps_checkin';
  if coalesce(v_require_gps, false) then
    select value into v_venue from app_settings where key = 'venue_location';
    if v_venue is not null and v_venue ? 'lat' and v_venue ? 'lng' then
      if p_lat is null or p_lng is null then
        raise exception 'GPS location required to clock in';
      end if;
      v_venue_lat := (v_venue->>'lat')::double precision;
      v_venue_lng := (v_venue->>'lng')::double precision;
      v_dist_km := 2 * 6371 * asin(sqrt(
        pow(sin(radians(p_lat - v_venue_lat) / 2), 2) +
        cos(radians(v_venue_lat)) * cos(radians(p_lat)) * pow(sin(radians(p_lng - v_venue_lng) / 2), 2)
      ));
      if v_dist_km > 0.15 then
        raise exception 'Vous devez être sur place pour pointer (% m)', round((v_dist_km * 1000)::numeric, 0);
      end if;
    end if;
  end if;

  insert into time_entries (employee_id, clock_in_lat, clock_in_lng) values (p_employee_id, p_lat, p_lng) returning * into v_entry;
  return v_entry;
end;
$$;
grant execute on function clock_in(uuid, double precision, double precision) to authenticated;

-- clock_out also auto-raises an overtime alert (visible in Approvals) the
-- first time an employee crosses the weekly threshold in the current
-- payroll period, instead of on every single clock-out.
create or replace function clock_out(p_employee_id uuid) returns time_entries
language plpgsql security definer set search_path = public as $$
declare
  v_entry time_entries;
  v_alerts_enabled boolean;
  v_threshold numeric;
  v_period_start timestamptz;
  v_week_hours numeric;
begin
  if not is_staff() then raise exception 'staff access required'; end if;
  update time_entries set clock_out = now()
    where employee_id = p_employee_id and clock_out is null
    returning * into v_entry;
  if v_entry is null then raise exception 'this employee is not clocked in'; end if;

  select (value #>> '{}')::boolean into v_alerts_enabled from app_settings where key = 'overtime_alerts_enabled';
  if coalesce(v_alerts_enabled, false) then
    select coalesce((value #>> '{}')::numeric, 40) into v_threshold from app_settings where key = 'overtime_threshold_hours';
    select coalesce((value #>> '{}')::timestamptz, date_trunc('week', now())) into v_period_start
      from app_settings where key = 'payroll_period_start';

    select coalesce(sum(extract(epoch from (coalesce(clock_out, now()) - clock_in)) / 3600.0), 0) into v_week_hours
      from time_entries where employee_id = p_employee_id and clock_in >= v_period_start;

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

create or replace function add_overtime_request(p_employee_id uuid, p_hours numeric, p_note text default null) returns overtime_requests
language plpgsql security definer set search_path = public as $$
declare v_req overtime_requests;
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  insert into overtime_requests (employee_id, hours, note, status, auto)
    values (p_employee_id, p_hours, p_note, 'pending', false)
    returning * into v_req;
  return v_req;
end;
$$;
grant execute on function add_overtime_request(uuid, numeric, text) to authenticated;

create or replace function resolve_overtime_request(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'manager access required'; end if;
  if p_status not in ('approved', 'dismissed') then raise exception 'invalid status'; end if;
  update overtime_requests set status = p_status, resolved_at = now(), resolved_by = auth.uid()
    where id = p_id;
end;
$$;
grant execute on function resolve_overtime_request(bigint, text) to authenticated;
