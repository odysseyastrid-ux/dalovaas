-- 0020 — Optional marketing consent on contest entries (CASL / LCAP).
--
-- The contest form has an extra, optional, unticked box: "I agree to receive
-- Magicstick Clean's offers by email or text". Only entries with a consent
-- date may receive commercial messages. The date and the wording version are
-- kept as the record of consent; withdrawing (an "unsubscribe" reply) is
-- recorded by the owner by clearing marketing_consent_at in the dashboard.

alter table contest_entries
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists marketing_consent_version text
    check (marketing_consent_version is null or char_length(marketing_consent_version) <= 40);
