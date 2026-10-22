-- 0019 — Security advisor "extension_in_public": pg_net was created in the
-- public schema by 0016. It is not relocatable, so recreate it in the
-- `extensions` schema. Its functions always live in the `net` schema, so the
-- purge cron job (`select net.http_post(...)`, stored as text) is unaffected.

drop extension if exists pg_net;
create extension if not exists pg_net with schema extensions;
