-- Security audit follow-up (S01, S04, S05, S06).
--
-- S01  A booking was confirmed even when its gift card could no longer cover
--      the deposit: the balance was read, the deposit computed from that read,
--      and the debit happened later — two bookings could both read the same
--      balance, and the second was confirmed with a debit of $0.
--      -> reserve_booking_deposit() locks the card, debits what it can, works
--         out what is still due online and confirms the booking ONLY if the
--         deposit is really covered, all in one transaction.
-- S04  Abandoned `pending_payment` bookings piled up and kept their gift-card
--      amount. -> expire_pending_booking() cancels one and gives the held
--      amount back to the card.
-- S05  Rate limits were "count rows, then insert a row" — racy and silently
--      disabled on a database error. -> rate_limit_hit() is a single atomic
--      upsert; callers fail closed when it errors.
-- S06  Length limits on the free-text booking fields, enforced in the schema.
--
-- Safe to apply before the matching edge functions are deployed: nothing
-- here changes an existing function's behaviour.

-- ---------------------------------------------------------------------------
-- Atomic rate limiter (fixed windows). Service role only.
-- ---------------------------------------------------------------------------
create table if not exists rate_limit_counters (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table rate_limit_counters enable row level security;  -- no policies: service role only

-- Counts one hit for `p_key` in the current window and says whether it is
-- still within `p_max`. One INSERT .. ON CONFLICT statement, so concurrent
-- callers can never all read the same stale count.
create or replace function rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 200
     or p_window_seconds <= 0 or p_max <= 0 then
    raise exception 'invalid rate limit arguments';
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into rate_limit_counters as c (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = c.hits + 1
  returning c.hits into v_hits;
  -- Housekeeping, spread over calls so no scheduler is needed.
  if random() < 0.02 then
    delete from rate_limit_counters where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_max;
end;
$$;

revoke execute on function rate_limit_hit(text, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Idempotent checkout attempts + length limits on booking text (S04, S06).
-- ---------------------------------------------------------------------------
alter table bookings add column if not exists idempotency_key text;
create unique index if not exists bookings_idempotency_key_uniq
  on bookings (idempotency_key) where idempotency_key is not null;
create index if not exists bookings_pending_created_idx
  on bookings (created_at) where status = 'pending_payment';

-- NOT VALID: enforced for every new/updated row without failing on rows that
-- already exist; validate later if you want to check history too.
alter table bookings
  add constraint bookings_guest_name_len check (char_length(guest_name) between 1 and 120) not valid,
  add constraint bookings_guest_contact_len check (char_length(guest_contact) between 3 and 200) not valid,
  add constraint bookings_notes_len check (char_length(notes) <= 2000) not valid,
  add constraint bookings_zone_len check (zone is null or char_length(zone) <= 80) not valid,
  add constraint bookings_time_window_len check (char_length(time_window) between 1 and 60) not valid;

-- ---------------------------------------------------------------------------
-- reserve_booking_deposit — S01.
--
-- Called by create-payment-intent right after it inserts the booking
-- (status pending_payment, deposit_cents = the full required deposit).
-- In ONE transaction it:
--   1. locks the booking and (if given) the gift card row,
--   2. takes up to p_planned from the card's CURRENT balance (a hold; if the
--      booking is retried it returns the same amount, never debits twice),
--   3. computes what is still due online = deposit - held; a leftover below
--      the Stripe minimum is moved to the appointment balance (the explicit
--      rule the app already had),
--   4. stores both numbers on the booking, and
--   5. marks the booking confirmed only when nothing is left to charge.
-- Two bookings racing on one card serialize on the card lock, so the second
-- one sees what the first one left and is asked to pay the rest by card.
-- ---------------------------------------------------------------------------
create or replace function reserve_booking_deposit(
  p_booking uuid,
  p_card uuid,
  p_planned integer,
  p_deposit integer,
  p_min_charge integer
)
returns table (applied_cents integer, online_due_cents integer, confirmed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings;
  v_balance integer;
  v_held integer := 0;
  v_apply integer;
  v_due integer;
begin
  select * into v_booking from bookings where id = p_booking for update;
  if not found then
    raise exception 'booking % not found', p_booking;
  end if;
  if v_booking.status <> 'pending_payment' then
    -- Retried call on a booking that already moved on: report, don't redo.
    return query select v_booking.gift_card_applied_cents, v_booking.deposit_cents,
                        v_booking.status = 'confirmed';
    return;
  end if;

  if p_card is not null and p_planned > 0 then
    select balance_cents into v_balance
      from gift_cards where id = p_card and status = 'active' for update;
    if v_balance is not null then
      -- Already held for this booking (retry)? Reuse it.
      select coalesce(-sum(amount_cents), 0) into v_held
        from gift_card_transactions
       where gift_card_id = p_card and booking_id = p_booking
         and (kind = 'redeem' or (kind = 'adjust' and note = 'release'));
      if v_held <= 0 then
        v_apply := least(v_balance, greatest(p_planned, 0));
        if v_apply > 0 then
          update gift_cards set balance_cents = balance_cents - v_apply, updated_at = now()
           where id = p_card;
          insert into gift_card_transactions (gift_card_id, booking_id, amount_cents, kind, note)
          values (p_card, p_booking, -v_apply, 'redeem', 'hold');
          v_held := v_apply;
        else
          v_held := 0;
        end if;
      end if;
    end if;
  end if;

  v_due := greatest(0, p_deposit - v_held);
  if v_due > 0 and v_due < p_min_charge then
    v_due := 0;
  end if;

  update bookings
     set deposit_cents = v_due,
         gift_card_planned_cents = v_held,
         gift_card_applied_cents = v_held,
         status = case when v_due = 0 then 'confirmed'::booking_status else status end,
         paid_at = case when v_due = 0 then now() else paid_at end
   where id = p_booking;

  return query select v_held, v_due, v_due = 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- expire_pending_booking — S04. Cancels an abandoned booking and gives its
-- held gift-card amount back. Does nothing unless the booking is still
-- pending_payment and older than p_older_than (so a payment that is finishing
-- right now is never cancelled from under the customer).
-- ---------------------------------------------------------------------------
create or replace function expire_pending_booking(p_booking uuid, p_older_than interval default interval '2 hours')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings;
  v_held integer;
begin
  select * into v_booking from bookings where id = p_booking for update;
  if not found or v_booking.status <> 'pending_payment'
     or v_booking.created_at > now() - p_older_than then
    return false;
  end if;

  if v_booking.gift_card_id is not null then
    perform 1 from gift_cards where id = v_booking.gift_card_id for update;
    select coalesce(-sum(amount_cents), 0) into v_held
      from gift_card_transactions
     where gift_card_id = v_booking.gift_card_id and booking_id = p_booking
       and (kind = 'redeem' or (kind = 'adjust' and note = 'release'));
    if v_held > 0 then
      update gift_cards set balance_cents = balance_cents + v_held, updated_at = now()
       where id = v_booking.gift_card_id and status = 'active';
      insert into gift_card_transactions (gift_card_id, booking_id, amount_cents, kind, note)
      values (v_booking.gift_card_id, p_booking, v_held, 'adjust', 'release');
    end if;
  end if;

  -- idempotency_key is freed so the visitor's next attempt with the same key
  -- starts a fresh booking instead of replaying this cancelled one.
  update bookings
     set status = 'cancelled', gift_card_applied_cents = 0, gift_card_planned_cents = 0,
         idempotency_key = null
   where id = p_booking;
  return true;
end;
$$;

revoke execute on function reserve_booking_deposit(uuid, uuid, integer, integer, integer) from public, anon, authenticated;
revoke execute on function expire_pending_booking(uuid, interval) from public, anon, authenticated;
