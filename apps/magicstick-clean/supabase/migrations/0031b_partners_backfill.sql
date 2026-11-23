-- Existing orders count as handled for the new automatic emails (no surprise
-- confirmation or invoice for past orders).
update quote_requests set confirmation_date = scheduled_date where scheduled_date is not null and confirmation_date is null;
update quote_requests set invoice_sent_at = now() where completed_at is not null and invoice_sent_at is null;
