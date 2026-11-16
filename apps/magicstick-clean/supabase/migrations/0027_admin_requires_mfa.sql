-- Owner's request (Nov 16, 2026): lock the back office behind a second
-- factor. Every admin policy in this database checks
--   exists (select 1 from admin_users where id = auth.uid())
-- and that sub-query runs under admin_users' own row security. This
-- RESTRICTIVE policy makes admin_users invisible to any session that did not
-- pass the authenticator-app step (JWT claim aal = 'aal2'), so a stolen
-- password alone opens nothing: quotes, bookings, gift cards, leads, uploads,
-- services and AI notes all stay closed. admin.html walks the owner through
-- the one-time QR setup and asks for the 6-digit code at each sign-in.
-- Edge functions that act for the owner check the same claim (requireAdmin).
--
-- Lost phone: an operator with database access removes the factor
-- (delete from auth.mfa_factors where user_id = '<owner id>') and the owner
-- sets up a new one at the next sign-in.
create policy "admin access requires two-step sign-in"
  on admin_users
  as restrictive
  for select
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');
