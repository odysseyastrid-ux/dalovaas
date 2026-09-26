-- Categories for the admin dashboard's Services tab (not shown publicly).
insert into service_categories (id, name, name_fr, sort_order) values
  ('residential', 'Residential', 'Résidentiel', 1),
  ('commercial', 'Commercial', 'Commercial', 2)
on conflict (id) do update set
  name = excluded.name,
  name_fr = excluded.name_fr;

-- Bookable services catalog (mirrors the pricing shown on the site).
-- Priced on a real hourly rate: $43.50/h regular (base_price_cents),
-- $37/h (~15% off) automatically applied to a customer's first booking
-- (first_booking_price_cents) — see create-payment-intent and
-- migration 0007 for how eligibility is decided.
-- Move-In/Move-Out, Office, Retail, and Post-Construction stay
-- custom-quote-only and are intentionally not seeded here.

insert into services (id, name, name_fr, description, description_fr, base_price_cents, first_booking_price_cents, deposit_cents, duration_minutes, sort_order, category_id) values
  ('standard', 'Standard Cleaning', 'Nettoyage standard', 'Regular maintenance for kitchens, bathrooms, floors, and dusting.', 'Entretien régulier des cuisines, salles de bain, planchers et époussetage.', 8700, 7400, 3000, 120, 1, 'residential'),
  ('deep', 'Deep Cleaning', 'Nettoyage en profondeur', 'A full top-to-bottom reset: appliances, baseboards, cabinets, windows, and everything in between.', 'Une remise à neuf complète : électroménagers, plinthes, armoires, fenêtres et tout le reste.', 17400, 14800, 5000, 240, 2, 'residential'),
  ('airbnb', 'Airbnb & Short-Term Rental Turnover', 'Roulement Airbnb et location court terme', 'Guest-ready resets between bookings: beds remade, bathrooms reset, restocked, and staged.', 'Prêt pour les invités entre les réservations : lits refaits, salles de bain nettoyées, réapprovisionnées et mises en scène.', 6525, 5550, 2500, 90, 3, 'residential')
on conflict (id) do update set
  name_fr = excluded.name_fr,
  description_fr = excluded.description_fr,
  base_price_cents = excluded.base_price_cents,
  first_booking_price_cents = excluded.first_booking_price_cents,
  category_id = excluded.category_id;

-- Terms of Service sections shown on /terms.html. summary_tldr is the short
-- accordion preview; full_content is a placeholder here — replace with the
-- real clause text (matching terms.html's existing 12 sections) before this
-- table is actually read by the front end.
insert into terms_of_service (section_number, title, category, icon_name, summary_tldr, full_content, is_critical, display_order) values
  (1, 'Acceptance & Scope of Service', 'General', 'file-text', 'By booking a service, you agree to these terms. Services are performed as agreed upon during booking.', 'Full legal text regarding agreement scope, terms acceptance, and binding service contracts...', false, 1),
  (2, 'Booking & Billing', 'Payments', 'credit-card', 'Priced per estimate or hourly rate. Payment is processed upon completion or as agreed.', 'Full legal text detailing payment methods, automatic card charges, authorization holds, and billing disputes...', true, 2),
  (3, 'Cancellation & Refunds', 'Cancellations', 'clock', 'Free cancellation up to 24 hours prior. Cancellations under 24 hours may incur a fee.', 'Full legal text describing cancellation deadlines, lock-out fees, late rescheduling penalties, and refund eligibility...', true, 3),
  (4, 'Insurance & Liability', 'Security', 'shield-check', 'Fully insured. Any damage must be reported within 24 hours of service completion.', 'Full legal text covering liability thresholds, reporting protocols, structural vs personal property claims...', true, 4),
  (5, 'Satisfaction Guarantee', 'Quality', 'sparkles', 'If you are unsatisfied, notify us within 24 hours and we will re-clean the area free of charge.', 'Full legal text regarding quality assurance policies, follow-up inspection photos, and resolution terms...', true, 5),
  (6, 'Equipment & Access', 'Operations', 'key', 'Client must provide property access and ensure working water and electricity.', 'Full legal text outlining client responsibilities, key handling, code access, and utility requirements...', false, 6),
  (7, 'Non-Solicitation', 'Policy', 'user-x', 'Clients agree not to directly hire cleaners outside of the platform for 12 months.', 'Full legal text regarding direct hiring prohibitions, liquidated damages, and contractor protection clauses...', false, 7),
  (8, 'Communications & Privacy', 'Privacy', 'bell', 'We send SMS and email updates regarding your booking. Your data is protected.', 'Full legal text on SMS consent, opt-out mechanisms, photo usage for quality assurance, and privacy protection...', false, 8)
on conflict (display_order) do update set
  title = excluded.title,
  summary_tldr = excluded.summary_tldr,
  full_content = excluded.full_content,
  is_critical = excluded.is_critical,
  updated_at = current_timestamp;

-- Optional booking add-ons ("extras"). Owner-editable in the admin dashboard;
-- prices here are the starting defaults. See migration 0011.
insert into service_addons (id, name, name_fr, price_cents, unit, min_qty, sort_order) values
  ('inside-oven',       'Inside the Oven',            'Intérieur du four',                     3500, 'flat',   1, 1),
  ('inside-fridge',     'Inside the Fridge',          'Intérieur du réfrigérateur',            3000, 'flat',   1, 2),
  ('inside-cabinets',   'Inside Cabinets (emptied)',  'Intérieur des armoires (vidées)',       4000, 'flat',   1, 3),
  ('baseboards',        'Baseboards (hand-wiped)',    'Plinthes (essuyées à la main)',         2500, 'flat',   1, 4),
  ('interior-windows',  'Interior Windows',           'Fenêtres intérieures',                   700, 'window', 1, 5),
  ('walls',             'Walls',                      'Murs',                                   1400, 'room',   1, 6),
  ('laundry',           'Laundry — Wash & Fold',      'Lavage et pliage',                      2500, 'load',   1, 7),
  ('pet-premium',       'Pet Premium (extra hair)',   'Supplément animaux (poils)',            1500, 'flat',   1, 8)
on conflict (id) do update set
  name_fr = excluded.name_fr,
  unit = excluded.unit;
