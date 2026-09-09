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
