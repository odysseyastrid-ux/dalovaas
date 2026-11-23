-- "Bulle", the owner's AI agent in the dashboard (Nov 23, 2026). Separate from Louis
-- (the public chat). The agent only PROPOSES; the owner confirms every action.
--  - automation_settings: pause/resume each automatic email and add a short intro
--    paragraph (FR/EN) at the top of it. Read by the `automations` function.
--  - agent_messages: the conversation with Bulle, so it continues on any device.
create table if not exists automation_settings (
  kind text primary key check (kind in ('receipts','job_sheets','reminders','thanks','unpaid','confirmations',
    'deposit_receipts','deposit_reminders','owner_deposit_alerts','invoices','balance_reminders','prospects')),
  enabled boolean not null default true,
  intro_fr text check (char_length(intro_fr) <= 600),
  intro_en text check (char_length(intro_en) <= 600),
  updated_at timestamptz not null default now()
);
alter table automation_settings enable row level security;
create policy "admins manage automation settings" on automation_settings for all to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant select, insert, update, delete on automation_settings to authenticated;

create table if not exists agent_messages (
  id bigserial primary key,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 8000),
  created_at timestamptz not null default now()
);
alter table agent_messages enable row level security;
create policy "admins manage agent messages" on agent_messages for all to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant select, insert, delete on agent_messages to authenticated;
grant usage, select on sequence agent_messages_id_seq to authenticated;
