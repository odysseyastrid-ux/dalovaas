-- Dashboard "Commandes" (Nov 2026): every quote moves through one pipeline
--   Nouvelle -> Prix envoyé -> Payée -> Planifiée -> Faite   (or Annulée)
-- derived from existing columns (quoted_amount_cents, paid_at, status
-- 'declined') plus the confirmed appointment and completion stamp below.
-- The day-before reminder (phase 2) uses scheduled_date, never the client's
-- wished-for preferred_date.
alter table quote_requests
  add column if not exists scheduled_date date,
  add column if not exists scheduled_window text,
  add column if not exists completed_at timestamptz;

-- quote_requests uses column-level update grants for the dashboard (0023).
grant update (scheduled_date, scheduled_window, completed_at) on quote_requests to authenticated;
