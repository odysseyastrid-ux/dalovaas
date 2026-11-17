-- Second half of 0030 (applied separately on Nov 17, 2026).

-- Existing rows count as handled: automations only act on what happens from
-- now on (no surprise emails to past or test clients).
update quote_requests set receipt_sent_at = now() where paid_at is not null and receipt_sent_at is null;
update quote_requests set thanks_sent_at = now() where completed_at is not null and thanks_sent_at is null;
update quote_requests set unpaid_reminder_at = now() where quoted_at is not null and paid_at is null and unpaid_reminder_at is null;
update quote_requests set reminder_sent_at = now() where scheduled_date is not null and reminder_sent_at is null;

-- 4. Run the automations every 15 minutes (the function is idempotent and
--    rate limited, so it needs no secret).
select cron.unschedule('magicstick-automations') where exists (select 1 from cron.job where jobname = 'magicstick-automations');
select cron.schedule('magicstick-automations', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://siqpcnhfpseorjuwfrop.supabase.co/functions/v1/automations',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
$$);
