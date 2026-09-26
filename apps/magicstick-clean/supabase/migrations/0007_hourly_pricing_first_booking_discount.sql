-- Repriced services on a real hourly rate ($43.50/h regular) and added a
-- first-booking discount price ($37/h, ~15% off) computed from the same
-- duration. base_price_cents stays the "regular" price customers pay after
-- their first booking; first_booking_price_cents is what a customer with no
-- prior booking pays instead — the deposit amount charged today via Stripe
-- doesn't change, only the total/remaining-balance math shown to the
-- customer and stored on the booking.

alter table services
  add column first_booking_price_cents integer not null default 0 check (first_booking_price_cents >= 0);

update services set
  base_price_cents = round(duration_minutes / 60.0 * 4350),
  first_booking_price_cents = round(duration_minutes / 60.0 * 3700);

alter table bookings
  add column first_booking_discount_applied boolean not null default false;
