-- Bookable services catalog (mirrors the pricing shown on the site).
-- Move-In/Move-Out, Office, Retail, and Post-Construction stay
-- custom-quote-only and are intentionally not seeded here.

insert into services (id, name, name_fr, description, description_fr, base_price_cents, deposit_cents, duration_minutes, sort_order) values
  ('standard', 'Standard Cleaning', 'Nettoyage standard', 'Regular maintenance for kitchens, bathrooms, floors, and dusting.', 'Entretien régulier des cuisines, salles de bain, planchers et époussetage.', 13000, 3000, 120, 1),
  ('deep', 'Deep Cleaning', 'Nettoyage en profondeur', 'A full top-to-bottom reset: appliances, baseboards, cabinets, windows, and everything in between.', 'Une remise à neuf complète : électroménagers, plinthes, armoires, fenêtres et tout le reste.', 18000, 5000, 240, 2),
  ('airbnb', 'Airbnb & Short-Term Rental Turnover', 'Roulement Airbnb et location court terme', 'Guest-ready resets between bookings: beds remade, bathrooms reset, restocked, and staged.', 'Prêt pour les invités entre les réservations : lits refaits, salles de bain nettoyées, réapprovisionnées et mises en scène.', 10000, 2500, 90, 3)
on conflict (id) do update set
  name_fr = excluded.name_fr,
  description_fr = excluded.description_fr;
