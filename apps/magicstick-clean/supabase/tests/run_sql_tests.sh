#!/usr/bin/env bash
# Database tests for the security-audit fixes (S01, S02/S03, S05, S06 + 0015).
#
# They run against a THROWAWAY PostgreSQL (never your Supabase project): the
# script creates its own database, loads a minimal stand-in for Supabase's
# `auth` / `storage` schemas and roles (stub.sql), applies every migration in
# order, then checks behaviour — including real concurrency.
#
#   # one-off: a scratch cluster (Postgres >= 14, run as a non-root user)
#   initdb -D /tmp/pgtest && pg_ctl -D /tmp/pgtest -o "-p 5544 -k /tmp" start
#
#   PGHOST=/tmp PGPORT=5544 PGUSER=postgres ./supabase/tests/run_sql_tests.sh
#
# Exits non-zero on the first failed assertion.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS="$HERE/../migrations"
DB="${SQL_TEST_DB:-ms_sql_test}"

psql_admin() { psql -X -q -v ON_ERROR_STOP=1 -d postgres "$@"; }
psql_db()    { psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$DB" "$@"; }

fail() { echo "FAIL: $*" >&2; exit 1; }
assert_eq() { # name expected actual
  if [ "$2" != "$3" ]; then fail "$1 — expected [$2], got [$3]"; fi
  echo "ok   $1"
}
assert_error() { # name sql-run-as-role pattern
  local out
  out="$(psql_db -c "$2" 2>&1 || true)"
  if ! grep -qiE "$3" <<<"$out"; then fail "$1 — expected an error matching /$3/, got: $out"; fi
  echo "ok   $1"
}

echo "== building $DB"
psql_admin -c "drop database if exists $DB" >/dev/null 2>&1 || true
psql_admin -c "create database $DB"
psql_db -f "$HERE/stub.sql" >/dev/null 2>&1
for f in "$MIGRATIONS"/*.sql; do psql_db -f "$f" >/dev/null 2>&1 || fail "migration $(basename "$f") did not apply"; done
echo "ok   all migrations apply in order"

CARD='00000000-0000-0000-0000-0000000000aa'
psql_db <<EOF
insert into services(id,name,base_price_cents,deposit_cents) values ('std','Standard',9000,3000);
insert into gift_cards(id,code,initial_cents,balance_cents,status,source) values ('$CARD','MSC-TEST-TEST-TEST',9000,9000,'active','manual');
insert into bookings(id,guest_name,guest_contact,service_id,requested_date,time_window,amount_cents,deposit_cents,status,gift_card_id,gift_card_planned_cents)
select gen_random_uuid(),'W'||g,'w'||g||'@x.ca','std',current_date+3,'Morning',9000,3000,'pending_payment','$CARD',3000 from generate_series(1,20) g;
EOF

echo "== S01: 20 bookings race for one 90\$ gift card (30\$ deposit each)"
psql_db -c "select id from bookings order by guest_name" | xargs -P 20 -I{} \
  psql -X -q -t -A -d "$DB" -c "select * from reserve_booking_deposit('{}'::uuid,'$CARD'::uuid,3000,3000,50)" >/dev/null
assert_eq "exactly 3 bookings confirmed (3 x 30 = 90)" "3" "$(psql_db -c "select count(*) from bookings where status='confirmed'")"
assert_eq "no booking confirmed with 0 covered" "0" "$(psql_db -c "select count(*) from bookings where status='confirmed' and gift_card_applied_cents=0")"
assert_eq "17 bookings still owe the full deposit" "17" "$(psql_db -c "select count(*) from bookings where status='pending_payment' and deposit_cents=3000")"
assert_eq "card debited exactly 9000, balance 0" "9000|0" "$(psql_db -c "select (select -sum(amount_cents) from gift_card_transactions where kind='redeem'), balance_cents from gift_cards")"
BID="$(psql_db -c "select id from bookings where status='confirmed' limit 1")"
psql_db -c "select * from reserve_booking_deposit('$BID'::uuid,'$CARD'::uuid,3000,3000,50)" >/dev/null
assert_eq "retrying a booking never debits twice" "9000" "$(psql_db -c "select -sum(amount_cents) from gift_card_transactions where kind='redeem'")"

echo "== S01: partial balance, sub-0.50\$ leftover, expiry"
psql_db <<'EOF'
insert into gift_cards(id,code,initial_cents,balance_cents,status,source) values
 ('00000000-0000-0000-0000-0000000000b1','MSC-PART-PART-PART',2000,2000,'active','manual'),
 ('00000000-0000-0000-0000-0000000000b2','MSC-MINC-MINC-MINC',2980,2980,'active','manual');
insert into bookings(id,guest_name,guest_contact,service_id,requested_date,time_window,amount_cents,deposit_cents,status,gift_card_id,gift_card_planned_cents) values
 ('00000000-0000-0000-0000-00000000c001','Part','p@x.ca','std',current_date+3,'Morning',9000,3000,'pending_payment','00000000-0000-0000-0000-0000000000b1',2000),
 ('00000000-0000-0000-0000-00000000c002','Minc','m@x.ca','std',current_date+3,'Morning',9000,3000,'pending_payment','00000000-0000-0000-0000-0000000000b2',2980);
EOF
assert_eq "partial: 2000 held, 1000 still due, not confirmed" "2000|1000|f" "$(psql_db -c "select * from reserve_booking_deposit('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-0000000000b1',2000,3000,50)")"
assert_eq "leftover under 0.50\$ moves to the appointment, confirmed" "2980|0|t" "$(psql_db -c "select * from reserve_booking_deposit('00000000-0000-0000-0000-00000000c002','00000000-0000-0000-0000-0000000000b2',2980,3000,50)")"
assert_eq "a recent pending booking is not expired" "f" "$(psql_db -c "select expire_pending_booking('00000000-0000-0000-0000-00000000c001')")"
psql_db -c "update bookings set created_at = now() - interval '3 hours' where id in ('00000000-0000-0000-0000-00000000c001','00000000-0000-0000-0000-00000000c002')"
assert_eq "an old pending booking expires" "t" "$(psql_db -c "select expire_pending_booking('00000000-0000-0000-0000-00000000c001')")"
assert_eq "expiry gives the held amount back to the card" "2000" "$(psql_db -c "select balance_cents from gift_cards where id='00000000-0000-0000-0000-0000000000b1'")"
assert_eq "expiring twice is a no-op" "f|2000" "$(psql_db -c "select expire_pending_booking('00000000-0000-0000-0000-00000000c001'), (select balance_cents from gift_cards where id='00000000-0000-0000-0000-0000000000b1')")"
assert_eq "a confirmed booking never expires" "f" "$(psql_db -c "select expire_pending_booking('00000000-0000-0000-0000-00000000c002')")"

echo "== S05: atomic rate limiter"
assert_eq "30 parallel hits with max 5 -> exactly 5 allowed" "5" "$(seq 1 30 | xargs -P 30 -I{} psql -X -q -t -A -d "$DB" -c "select rate_limit_hit('test:ip',3600,5)" | grep -c '^t$')"
assert_error "anon cannot call the limiter" "set role anon; select rate_limit_hit('x',60,1)" "permission denied"
assert_error "anon cannot reserve deposits" "set role anon; select * from reserve_booking_deposit(gen_random_uuid(),null,0,0,50)" "permission denied"

echo "== S06: length limits live in the schema"
assert_error "a 100 000-character booking note is refused" "insert into bookings(guest_name,guest_contact,service_id,requested_date,time_window,amount_cents,deposit_cents,notes) values ('N','abc','std',current_date,'Morning',1,1,repeat('x',100000))" "bookings_notes_len"
assert_error "an oversized quote message is refused" "set role service_role; insert into quote_requests(name,contact,service,message) values ('N','abc','s',repeat('x',5000))" "quote_requests_message_len"

echo "== S02/S03: no anonymous writes to quotes or the upload bucket"
assert_error "anon cannot insert a quote" "set role anon; insert into quote_requests(name,contact,service) values ('Spam','v@example.com','x')" "row-level security"
assert_error "signed-in users cannot insert a quote directly either" "set role authenticated; insert into quote_requests(name,contact,service) values ('Spam','v@example.com','x')" "row-level security"
assert_error "anon cannot upload to the bucket" "set role anon; insert into storage.objects(bucket_id,name) values ('quote-uploads','evil/1.bin')" "row-level security"
assert_eq "the server (service role) still can save a quote" "new" "$(psql_db -c "set role service_role; insert into quote_requests(name,contact,service,status) values ('Ok','ok@example.com','Standard Cleaning','new') returning status" | head -1)"
assert_eq "bucket: 50 MB cap and 9 allowed MIME types" "52428800|9" "$(psql_db -c "select file_size_limit, array_length(allowed_mime_types,1) from storage.buckets where id='quote-uploads'")"

echo "== ai_knowledge: the public key reads only the 'client' row"
psql_db -c "update ai_knowledge set content='private' where id='owner'; update ai_knowledge set content='public' where id='client'" >/dev/null
assert_eq "anon sees only 'client'" "client" "$(psql_db -c "set role anon; select string_agg(id, ',') from ai_knowledge" | head -1)"

echo
echo "All database tests passed."
