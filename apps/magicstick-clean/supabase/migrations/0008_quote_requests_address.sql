-- Optional street address a visitor can add to a quote request.
alter table quote_requests
  add column address text check (char_length(address) <= 300);
