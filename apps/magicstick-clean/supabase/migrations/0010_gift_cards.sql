-- Real gift cards: bought online (Stripe) or issued by the owner, each with
-- a unique code and a balance that can be spent across one or more bookings.
-- All writes go through edge functions (service role); admins can read.

create table gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text unique,                         -- null until paid/issued
  initial_cents integer not null check (initial_cents between 500 and 200000),
  balance_cents integer not null default 0 check (balance_cents >= 0),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'void')),
  source text not null check (source in ('online', 'manual')),
  lang text not null default 'en' check (lang in ('en', 'fr')),
  purchaser_name text check (char_length(purchaser_name) <= 120),
  purchaser_email text check (char_length(purchaser_email) <= 254),
  recipient_name text check (char_length(recipient_name) <= 120),
  recipient_email text check (char_length(recipient_email) <= 254),
  message text check (char_length(message) <= 500),
  deliver_to text not null default 'recipient' check (deliver_to in ('recipient', 'purchaser')),
  request_id uuid references gift_card_requests(id) on delete set null,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  updated_at timestamptz not null default now()
);
create index gift_cards_created_at_idx on gift_cards (created_at desc);

create table gift_card_transactions (
  id bigint generated always as identity primary key,
  gift_card_id uuid not null references gift_cards(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  amount_cents integer not null,            -- + load/adjust up, - redeem
  kind text not null check (kind in ('load', 'redeem', 'adjust')),
  note text,
  created_at timestamptz not null default now()
);
create index gift_card_transactions_card_idx on gift_card_transactions (gift_card_id);
create index gift_card_transactions_booking_idx on gift_card_transactions (booking_id);

-- What a booking planned to take from a card (decided at checkout) vs. what
-- was actually deducted when the booking was confirmed.
alter table bookings
  add column gift_card_id uuid references gift_cards(id) on delete set null,
  add column gift_card_planned_cents integer not null default 0 check (gift_card_planned_cents >= 0),
  add column gift_card_applied_cents integer not null default 0 check (gift_card_applied_cents >= 0);

alter table gift_cards enable row level security;
alter table gift_card_transactions enable row level security;

create policy "admins can read gift cards"
  on gift_cards for select to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

create policy "admins can read gift card transactions"
  on gift_card_transactions for select to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()));

-- Activates a paid/issued card: generates its code (MSC-XXXX-XXXX-XXXX from
-- an unambiguous 32-letter alphabet, ~60 bits of randomness) and loads the
-- balance. Idempotent: calling it again on an active card just returns it,
-- so a retried Stripe webhook can't load the balance twice.
create function activate_gift_card(p_card uuid)
returns gift_cards
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
  v_row gift_cards;
begin
  select * into v_row from gift_cards where id = p_card for update;
  if not found or v_row.status <> 'pending_payment' then
    return v_row;
  end if;

  loop
    v_bytes := gen_random_bytes(12);
    v_code := 'MSC-';
    for i in 0..11 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
      if i in (3, 7) then v_code := v_code || '-'; end if;
    end loop;
    exit when not exists (select 1 from gift_cards where code = v_code);
  end loop;

  update gift_cards
     set status = 'active', code = v_code, balance_cents = initial_cents,
         activated_at = now(), updated_at = now()
   where id = p_card
  returning * into v_row;

  insert into gift_card_transactions (gift_card_id, amount_cents, kind, note)
  values (p_card, v_row.initial_cents, 'load', v_row.source);

  return v_row;
end;
$$;

-- Deducts up to p_max from a card for a confirmed booking and returns what
-- was actually taken (less than p_max if the card ran low in the meantime).
-- Idempotent per booking, so webhook retries never deduct twice.
create function redeem_gift_card(p_card uuid, p_booking uuid, p_max integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already integer;
  v_balance integer;
  v_apply integer;
begin
  select coalesce(-sum(amount_cents), 0) into v_already
    from gift_card_transactions
   where gift_card_id = p_card and booking_id = p_booking and kind = 'redeem';
  if v_already > 0 then
    return v_already;
  end if;

  select balance_cents into v_balance
    from gift_cards where id = p_card and status = 'active' for update;
  if v_balance is null then
    return 0;
  end if;

  v_apply := least(v_balance, greatest(p_max, 0));
  if v_apply = 0 then
    return 0;
  end if;

  update gift_cards set balance_cents = balance_cents - v_apply, updated_at = now()
   where id = p_card;
  insert into gift_card_transactions (gift_card_id, booking_id, amount_cents, kind)
  values (p_card, p_booking, -v_apply, 'redeem');
  return v_apply;
end;
$$;

revoke execute on function activate_gift_card(uuid) from public, anon, authenticated;
revoke execute on function redeem_gift_card(uuid, uuid, integer) from public, anon, authenticated;
