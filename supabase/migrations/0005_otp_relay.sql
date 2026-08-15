-- OTP relay queue -- feeds the staff dashboard so a human can forward the
-- server-generated code to the customer over WhatsApp, since there is no
-- SMS provider configured yet. The code itself is still generated and
-- validated entirely by Supabase Auth; only the delivery channel is manual.
-- Populated by the relay-otp-sms Edge Function, which Supabase calls as a
-- "Send SMS" Auth Hook instead of an actual SMS provider.

create table otp_relay_queue (
  id bigint generated always as identity primary key,
  phone text not null,
  code text not null,
  created_at timestamptz not null default now(),
  sent boolean not null default false,
  sent_by uuid references staff(id),
  sent_at timestamptz
);

create index otp_relay_queue_pending_idx on otp_relay_queue (created_at) where not sent;

alter table otp_relay_queue enable row level security;

create policy otp_relay_queue_staff_select on otp_relay_queue for select using (is_staff());

revoke insert, update, delete on otp_relay_queue from authenticated, anon;

create or replace function mark_otp_relayed(p_id bigint) returns otp_relay_queue
language plpgsql security definer set search_path = public as $$
declare v_row otp_relay_queue;
begin
  if not is_staff() then raise exception 'staff access required'; end if;
  update otp_relay_queue set sent = true, sent_by = auth.uid(), sent_at = now()
    where id = p_id returning * into v_row;
  if v_row is null then raise exception 'not found'; end if;
  return v_row;
end;
$$;
grant execute on function mark_otp_relayed(bigint) to authenticated;

-- housekeeping: codes are single-use and expire fast (sms_otp_exp), no
-- reason to keep rows around -- fold into the existing per-minute cron.
create or replace function run_order_status_cron() returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer := 0; v_row orders;
begin
  for v_row in select * from advance_expired_orders() loop
    insert into event_outbox (order_id, kind) values (v_row.id, 'ready');
    v_count := v_count + 1;
  end loop;
  delete from otp_relay_queue where created_at < now() - interval '1 day';
  return v_count;
end;
$$;
