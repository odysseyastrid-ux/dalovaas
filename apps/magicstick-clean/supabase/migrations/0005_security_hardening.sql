-- Security hardening pass (see the accompanying edge-function and RLS
-- review). Two real gaps closed here:
--
-- 1. `bookings` allowed ANY anon/authenticated client to insert a row
--    directly via the REST API, with attacker-controlled amount_cents /
--    deposit_cents — bypassing create-checkout-session entirely (which is
--    the only path the real client ever uses, and which always derives the
--    price server-side from the `services` table, never from client input).
--    That direct-insert policy was never needed by the app and only ever
--    served as an open door for fake/tampered bookings; remove it. The
--    create-checkout-session and stripe-webhook functions use the
--    service_role key, which bypasses RLS entirely, so they are unaffected.
--
-- 2. `quote_requests` let a client set `customer_id` to ANY other user's id
--    on insert (the with check clause was just `true`), so a signed-in
--    attacker could attach a crafted quote request — including malicious
--    text fields — to a victim's account, which would then render in that
--    victim's own "My account" dashboard. Tighten the check so a client can
--    only ever attach a request to their own account or leave it a guest
--    request (customer_id null).

drop policy if exists "anyone can create a booking" on bookings;

alter policy "anyone can submit a quote request"
  on quote_requests
  with check (customer_id is null or customer_id = auth.uid());
