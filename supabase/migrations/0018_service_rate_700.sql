-- All categories pay the same rate now (owner request): 700 FCFA/h across
-- the board, including Service which was previously 500.
update app_settings
set value = '{"bar": 700, "counter": 700, "kitchen": 700, "dressing": 700, "service": 700}'::jsonb
where key = 'hourly_rates';
