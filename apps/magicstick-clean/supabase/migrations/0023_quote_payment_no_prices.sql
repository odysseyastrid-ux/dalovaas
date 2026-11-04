-- Prices are no longer shown on the site (owner's decision, Nov 4, 2026): every
-- price comes from a personalized quote. The owner sets that price on the quote
-- in the dashboard, which also creates a short payment code; the client opens
-- pay.html?code=… to see it and pay (Interac e-Transfer now, card once
-- ONLINE_PAYMENTS is on). The quote-pay function reads these columns with the
-- service role; only admins can write them (existing RLS update policy).

update services set description = 'Dust, debris and residue removal after a build or renovation.',
  description_fr = 'Retrait de poussière, débris et résidus après une construction ou une rénovation.'
  where id = 'post-construction';
update services set description = 'A full clean of an empty home before the keys change hands.',
  description_fr = 'Un ménage complet d''un logement vide avant la remise des clés.'
  where id = 'move-in-out';
update services set description = 'Offices, retail and commercial spaces cleaned around your hours.',
  description_fr = 'Bureaux, commerces et espaces commerciaux nettoyés selon vos heures.'
  where id = 'commercial';
update services set description = 'Interior and reachable exterior windows and glass.',
  description_fr = 'Fenêtres et vitres intérieures et extérieures accessibles.'
  where id = 'windows';

alter table quote_requests
  add column if not exists quoted_amount_cents integer
    check (quoted_amount_cents is null or quoted_amount_cents between 100 and 2000000),
  add column if not exists quote_note text
    check (quote_note is null or char_length(quote_note) <= 500),
  add column if not exists quoted_at timestamptz,
  add column if not exists pay_code text unique
    check (pay_code is null or pay_code ~ '^[A-HJ-NP-Z2-9]{10}$'),
  add column if not exists paid_at timestamptz,
  add column if not exists payment_method text
    check (payment_method is null or payment_method in ('card', 'interac', 'cash', 'other')),
  add column if not exists stripe_payment_intent_id text;

grant update (quoted_amount_cents, quote_note, quoted_at, pay_code, paid_at, payment_method)
  on quote_requests to authenticated;
