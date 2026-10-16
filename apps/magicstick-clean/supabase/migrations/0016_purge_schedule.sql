-- Daily housekeeping of quote uploads that never became a quote (audit S03).
--
-- The `submit-quote` function's `purge_orphans` action is called once a day by
-- pg_cron (through pg_net). The job authenticates with a random secret kept in
-- Supabase Vault (name: purge_secret); the function checks it with
-- purge_secret_ok(), which only the service role can call. The secret itself is
-- NOT in this file — it is created once, by hand:
--
--   select vault.create_secret('<64 random hex characters>', 'purge_secret');
--
-- Rotating it = delete that vault row and create a new one; nothing else changes.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.purge_secret_ok(p_secret text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select p_secret is not null
     and p_secret <> ''
     and exists (select 1 from vault.decrypted_secrets s
                 where s.name = 'purge_secret' and s.decrypted_secret = p_secret);
$$;

revoke all on function public.purge_secret_ok(text) from public, anon, authenticated;
grant execute on function public.purge_secret_ok(text) to service_role;

-- 03:17 UTC every day.
select cron.schedule(
  'purge-quote-orphans',
  '17 3 * * *',
  $job$
  select net.http_post(
    url := 'https://siqpcnhfpseorjuwfrop.supabase.co/functions/v1/submit-quote',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-purge-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'purge_secret')
    ),
    body := '{"action":"purge_orphans"}'::jsonb
  );
  $job$
);
