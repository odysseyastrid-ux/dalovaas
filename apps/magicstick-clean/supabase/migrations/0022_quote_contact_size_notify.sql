-- 0022 — Quote form v2 and owner notification.
--
-- * Separate phone / email fields (at least one is required by submit-quote;
--   `contact` keeps the one used to reach the client, so the dashboard and
--   the review-request flow keep working unchanged).
-- * Approximate home size (square footage range) and, for requests sent from
--   the booking page while online payment is off, the preferred time window.
-- * `source` tells a plain quote from a booking request.
-- * `owner_notified_at` is stamped when the owner's email was accepted by
--   Resend. The Database Webhook that used to call notify-quote-request was
--   never configured on the project, so quotes were saved but nobody was told;
--   submit-quote now sends the email itself and records it here.

alter table quote_requests
  add column if not exists phone text check (phone is null or char_length(phone) <= 40),
  add column if not exists email text check (email is null or char_length(email) <= 200),
  add column if not exists home_size text check (home_size is null or char_length(home_size) <= 60),
  add column if not exists preferred_time text check (preferred_time is null or char_length(preferred_time) <= 40),
  add column if not exists source text not null default 'quote' check (source in ('quote', 'booking')),
  add column if not exists lang text check (lang is null or lang in ('en', 'fr')),
  add column if not exists owner_notified_at timestamptz;
