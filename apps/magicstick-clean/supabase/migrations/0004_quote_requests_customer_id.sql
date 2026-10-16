-- Lets a signed-in customer see their own past quote requests on the
-- "My account" dashboard, the same way they already see their bookings.
-- Anonymous (guest) quote requests keep working unchanged — this column is
-- nullable and only set when the visitor was signed in at submit time.

alter table quote_requests add column customer_id uuid references auth.users(id) on delete set null;

create policy "a customer can read their own quote requests"
  on quote_requests for select
  to authenticated
  using (customer_id = auth.uid());

create index quote_requests_customer_id_idx on quote_requests (customer_id);
