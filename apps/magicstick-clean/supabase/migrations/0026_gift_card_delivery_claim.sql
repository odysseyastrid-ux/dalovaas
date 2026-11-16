-- Gift cards are now paid directly by card on gift-cards.html. Both the
-- browser (action "confirm", which re-checks the payment with Stripe) and the
-- Stripe webhook can activate the same card; delivered_at lets exactly one of
-- them send the emails (claimed with a conditional update).
alter table gift_cards add column if not exists delivered_at timestamptz;

-- Cards already active were delivered when they were activated.
update gift_cards set delivered_at = coalesce(activated_at, now())
 where status <> 'pending_payment' and delivered_at is null;
