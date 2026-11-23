-- Partner orders are created from the dashboard with source = 'partner' (0031).
alter table quote_requests drop constraint if exists quote_requests_source_check;
alter table quote_requests add constraint quote_requests_source_check
  check (source = any (array['quote', 'booking', 'partner']));
