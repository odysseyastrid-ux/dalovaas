-- The Supabase security linter flags handle_new_user() (a SECURITY DEFINER
-- trigger function) as callable directly via PostgREST's auto-exposed
-- /rest/v1/rpc/handle_new_user, by anon and authenticated alike. Postgres
-- itself refuses to run a trigger function outside of trigger context, so
-- this was never a real write path — but there's no reason to leave the
-- grant in place either.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
