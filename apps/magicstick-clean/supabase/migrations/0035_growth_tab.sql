-- "Croissance" tab (owner's request, Nov 23, 2026): sign-up checklist and
-- ready-to-send texts. Each public request gets its own personalized reply.
create table if not exists growth_checklist (
  key text primary key check (char_length(key) <= 60),
  done_at timestamptz not null default now()
);
alter table growth_checklist enable row level security;
create policy "admins manage the growth checklist" on growth_checklist for all to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant select, insert, update, delete on growth_checklist to authenticated;

alter table prospects add column if not exists reply_text text check (char_length(reply_text) <= 1500);
grant update (reply_text) on prospects to authenticated;

update prospects set reply_text = 'Hi! I''m Louis from Magicstick Clean, based in the Rockland area. A recurring 5-hour clean every other Monday is exactly the kind of work I do. I''d love to hear more about the space: I can tell you right away how many people I can bring and send you a clear price. Text me at 343-843-7761 or message me here 🙂'
  where website = 'https://www.facebook.com/groups/777450978950234/posts/6172153746146570/';
update prospects set reply_text = 'Welcome to Rockland! I''m Louis from Magicstick Clean, a local cleaning business right here. I do regular and one-time cleans, bring all my supplies, and you get a clear price before anything is booked. Happy to help you settle in. Text me at 343-843-7761 or get a free quote at magicstickclean.ca'
  where website = 'https://www.facebook.com/groups/777450978950234/posts/9141935415835040/';
update prospects set reply_text = 'Hi! I''m Louis from Magicstick Clean in Rockland, and I can come quickly for a garage clean-up. Send me a couple of photos and I''ll tell you right away what I can do and the price. Text 343-843-7761 🙂'
  where website = 'https://www.facebook.com/groups/777450978950234/posts/9175333999161848/';
update prospects set reply_text = 'Hi! I''m Louis from Magicstick Clean, a local home cleaning business in Rockland. Weekly, every two weeks, monthly or one-time, with all supplies included and a clear price upfront. Free quote at magicstickclean.ca or text me at 343-843-7761.'
  where website = 'https://www.facebook.com/groups/1010165606896370/posts/1331671528079108/';
update prospects set reply_text = 'Hi! I''m Louis from Magicstick Clean, based in Rockland. A monthly clean works great for me: same day each month, all supplies included, and you get a clear price before the first visit. Text me at 343-843-7761 and I''ll send you a quote today 🙂'
  where website = 'https://www.facebook.com/groups/1146481795392382/posts/29083528181261035/';
update prospects set reply_text = 'Hello, I saw your ad for a house cleaner. I''m Louis from Magicstick Clean, a local cleaning business in Ottawa and Orléans. I bring all supplies, I''m flexible on days, and I send a clear price before booking. Could you tell me the size of the home and how often you''d like it cleaned? You can also reach me at 343-843-7761. Thank you!'
  where website = 'https://www.kijiji.ca/v-cleaning-housekeeper-jobs/ottawa/house-cleaner-wanted/1746256785';
update prospects set reply_text = 'Hello, I''m interested in your part-time home cleaning position. I''m Louis from Magicstick Clean: I clean homes in Ottawa every week, bring my own supplies, and can work on a regular schedule. Which days and hours would you need? You can text me at 343-843-7761. Thank you!'
  where website = 'https://www.kijiji.ca/v-cleaning-housekeeper-jobs/ottawa/part-time-home-cleaner-wanted/1743945427';
