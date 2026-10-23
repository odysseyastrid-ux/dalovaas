-- 0021 — Service descriptions still said $33/h for commercial and windows,
-- while the price charged is $30/h (windows: $30/h minus the permanent 15 %,
-- i.e. $25.50/h). Text only; prices are unchanged.

update services set
  description = 'Offices, retail and commercial spaces cleaned around your hours, billed at $30/h with a 3-hour minimum.',
  description_fr = 'Bureaux, commerces et espaces commerciaux nettoyés selon vos heures, facturé à 30 $/h avec un minimum de 3 heures.'
where id = 'commercial';

update services set
  description = 'Interior and reachable exterior windows and glass, $30/h with a permanent 15% discount ($25.50/h), 3-hour minimum.',
  description_fr = 'Fenêtres et vitres intérieures et extérieures accessibles, 30 $/h avec un rabais permanent de 15 % (25,50 $/h), minimum 3 heures.'
where id = 'windows';
