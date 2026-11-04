-- Owner's decision (Nov 4, 2026): minimum $39.50/h to stay profitable. These
-- rates are internal only (never shown on the site); the dashboard's price
-- calculator reads them (base_price_cents / duration hours).
update services set base_price_cents = 11850
  where id in ('standard', 'airbnb', 'commercial', 'windows') and base_price_cents < 11850;
