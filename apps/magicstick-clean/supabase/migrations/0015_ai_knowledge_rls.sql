-- Audit follow-up (deployment checklist): `ai_knowledge` is read by both AI
-- assistants but its table and access rules were never in a migration. This
-- records what production already has, and is safe to re-run.
--
--   id = 'client'  — the owner's notes for the PUBLIC chat. The public key may
--                    read this one row (the chat function reads it as anon).
--   id = 'owner'   — private notes for the owner co-pilot. NEVER readable with
--                    the public key; only admins (admin_users) can read/write.

create table if not exists ai_knowledge (
  id text primary key,
  content text not null default '',
  content_fr text not null default '',
  updated_at timestamptz not null default now()
);

alter table ai_knowledge enable row level security;

drop policy if exists ai_knowledge_public_read_client on ai_knowledge;
create policy ai_knowledge_public_read_client
  on ai_knowledge for select
  to anon, authenticated
  using (id = 'client');

drop policy if exists ai_knowledge_admin_all on ai_knowledge;
create policy ai_knowledge_admin_all
  on ai_knowledge for all
  to authenticated
  using (exists (select 1 from admin_users a where a.id = auth.uid()))
  with check (exists (select 1 from admin_users a where a.id = auth.uid()));

insert into ai_knowledge (id) values ('client'), ('owner') on conflict (id) do nothing;
