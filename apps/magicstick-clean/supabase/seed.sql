-- Bookable services catalog (mirrors the pricing shown on the site).
-- Move-In/Move-Out, Office, Retail, and Post-Construction stay
-- custom-quote-only and are intentionally not seeded here.

insert into services (id, name, description, base_price_cents, deposit_cents, duration_minutes, sort_order) values
  ('standard', 'Standard Cleaning', 'Regular maintenance for kitchens, bathrooms, floors, and dusting.', 13000, 3000, 120, 1),
  ('deep', 'Deep Cleaning', 'A full top-to-bottom reset: appliances, baseboards, cabinets, windows, and everything in between.', 18000, 5000, 240, 2),
  ('airbnb', 'Airbnb & Short-Term Rental Turnover', 'Guest-ready resets between bookings: beds remade, bathrooms reset, restocked, and staged.', 10000, 2500, 90, 3)
on conflict (id) do nothing;
