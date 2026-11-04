-- Leads from the area popup (Nov 2026): visitors who leave a name + email or
-- phone so the owner can follow up even if they don't buy. Stored with the
-- newsletter subscribers. Only people who ticked the consent box are saved
-- (CASL express consent: consent_at + consent_version).
alter table newsletter_subscribers alter column email drop not null;
alter table newsletter_subscribers
  add column if not exists name text check (name is null or char_length(name) <= 120),
  add column if not exists phone text check (phone is null or char_length(phone) <= 40),
  add column if not exists zone text check (zone is null or char_length(zone) <= 80),
  add column if not exists source text not null default 'newsletter' check (source in ('newsletter', 'popup')),
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text check (consent_version is null or char_length(consent_version) <= 40);
alter table newsletter_subscribers drop constraint if exists newsletter_email_or_phone;
alter table newsletter_subscribers add constraint newsletter_email_or_phone check (email is not null or phone is not null);
create unique index if not exists newsletter_subscribers_phone_key on newsletter_subscribers (phone) where phone is not null;
