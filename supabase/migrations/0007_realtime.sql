-- The frontend has been subscribing to postgres_changes on these tables
-- since the first migration, but nothing was ever added to the
-- supabase_realtime publication -- so every "live" list (active orders,
-- order tracking, menu, branding, OTP relay queue) only ever refreshed on
-- a full page reload, never on an actual change. This is the fix.

alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table menu_items;
alter publication supabase_realtime add table app_settings;
alter publication supabase_realtime add table otp_relay_queue;
