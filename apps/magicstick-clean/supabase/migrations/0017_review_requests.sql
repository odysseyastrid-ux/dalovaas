-- 0017 — Google review requests, tracked per client.
--
-- The admin "Ask for a review" window (admin.html) stamps this column when the
-- owner sends the message (text, WhatsApp, email or copy), so the dashboard and
-- the owner co-pilot know who was already asked and never ask twice.
-- Additive only; the existing "admins can update ..." policies cover writes.

alter table bookings       add column if not exists review_requested_at timestamptz;
alter table quote_requests add column if not exists review_requested_at timestamptz;

create index if not exists bookings_review_todo_idx
  on bookings (requested_date desc)
  where status = 'completed' and review_requested_at is null;
