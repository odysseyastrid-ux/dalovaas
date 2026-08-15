-- delete_order silently failed (FK violation) for any order linked to a
-- reward redemption, because reward_redemptions.order_id had no ON DELETE
-- rule -- Postgres blocks the delete rather than leaving a dangling
-- reference. The frontend didn't surface the error either, so staff just
-- saw "nothing happens" and assumed the button was broken. Redemption
-- history should survive the order being deleted (points were already
-- spent), so null out the link instead of cascading the delete.
alter table reward_redemptions drop constraint reward_redemptions_order_id_fkey;
alter table reward_redemptions
  add constraint reward_redemptions_order_id_fkey
  foreign key (order_id) references orders(id) on delete set null;
