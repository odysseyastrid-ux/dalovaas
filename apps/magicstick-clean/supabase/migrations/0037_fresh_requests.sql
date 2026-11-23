-- Fresh public requests (owner's request, Nov 23, 2026): the requests added on
-- Nov 23 (0034) pointed to old posts; they are replaced by posts from November
-- 2026 found on Facebook groups and Reddit. Link + short summary only, never the
-- person's name or contact; the owner answers on the platform (CASL).
delete from prospects where category = 'request' and status = 'todo' and website in (
  'https://www.facebook.com/groups/777450978950234/posts/6172153746146570/',
  'https://www.facebook.com/groups/777450978950234/posts/9141935415835040/',
  'https://www.facebook.com/groups/777450978950234/posts/9175333999161848/',
  'https://www.facebook.com/groups/1010165606896370/posts/1331671528079108/',
  'https://www.facebook.com/groups/1146481795392382/posts/29083528181261035/',
  'https://www.kijiji.ca/v-cleaning-housekeeper-jobs/ottawa/house-cleaner-wanted/1746256785',
  'https://www.kijiji.ca/v-cleaning-housekeeper-jobs/ottawa/part-time-home-cleaner-wanted/1743945427');

insert into prospects (name, category, area, website, lang, notes, reply_text) values
 ('Ottawa : ménage en profondeur le 3 décembre', 'request', 'Ottawa', 'https://www.facebook.com/groups/966074270589479/posts/2474401666423391/', 'en',
  'Publié en novembre 2026 : ménage en profondeur d’une maison, de préférence le 3 décembre. La personne demande le prix.',
  'Hi! I''m Louis from Magicstick Clean, a local cleaning business in Ottawa. December 3rd works for me. Send me the size of the home (bedrooms, bathrooms) and a few photos, and I''ll give you a clear price the same day. Supplies included. Text 343-843-7761 or get a free quote at magicstickclean.ca 🙂'),
 ('Orléans : service de ménage régulier recherché', 'request', 'Orléans', 'https://www.facebook.com/groups/966074270589479/posts/2461527517710806/', 'en',
  'Publié en novembre 2026 : ménage général (fenêtres et planchers au besoin), pas de lavage ni de cuisine, maison sans fumée.',
  'Hi! I''m Louis from Magicstick Clean, based right next to Orléans. General cleaning with windows and floors as needed is exactly what I do, weekly, every two weeks or monthly, with all supplies included. Tell me the size of the home and how often you''d like it, and I''ll send you a clear price. Text 343-843-7761 🙂'),
 ('Orléans (Convent Glen) : grand ménage d’une maison 4 chambres', 'request', 'Orléans', 'https://www.facebook.com/groups/cgow.ca/posts/28084121017927574/', 'en',
  'Publié en novembre 2026 dans le groupe de Convent Glen / Orléans Wood : maison 4 chambres, 2,5 salles de bain, un ménage ponctuel. Vérifier si c’est encore à faire (date visée : mi-novembre).',
  'Hi! I''m Louis from Magicstick Clean, a local cleaning business in Orléans. If you still need it, I can do a one-time clean of your 4-bedroom, 2.5-bath home, supplies included, with a clear price before booking. Also happy to help before the holidays. Text 343-843-7761 or magicstickclean.ca 🙂'),
 ('Femme de ménage fiable avec références (groupe bilingue)', 'request', 'Ottawa–Gatineau', 'https://www.facebook.com/groups/1074514452558956/posts/29867588989491452/', 'fr',
  'Publié en novembre 2026 : cherche une femme de ménage fiable avec références (message en français et en anglais). Vérifier la ville dans la publication.',
  'Bonjour ! Je suis Louis de Magicstick Clean, une entreprise de ménage locale à Clarence-Rockland, Orléans, Ottawa et Gatineau. Je travaille avec mes propres produits, je réponds le jour même et vous recevez un prix clair avant de réserver. Avec plaisir de vous envoyer mes références. Textez-moi au 343-843-7761 🙂'),
 ('Reddit r/ottawa : « Cleaner recommendations »', 'request', 'Ottawa', 'https://www.reddit.com/r/ottawa/comments/1xeg1iv/cleaner_recommendations/', 'en',
  'Discussion de novembre 2026 où des gens d’Ottawa cherchent une personne pour le ménage. Lire les règles du sous-forum avant de répondre (la publicité y est souvent limitée).',
  'Hi! Local owner-operator here (Magicstick Clean, Orléans/Rockland/Ottawa/Gatineau). I bring all supplies, reply the same day and give a clear price before anything is booked. Happy to answer questions here or by text at 343-843-7761.'),
 ('Groupe Facebook « Ottawa Cleaning Services »', 'channel', 'Ottawa', 'https://www.facebook.com/groups/966074270589479', 'en',
  'Groupe très actif : plusieurs demandes de ménage par semaine (Orléans, Ottawa). À rejoindre et à vérifier chaque jour.', null),
 ('Groupe Facebook Convent Glen / Orléans Wood', 'channel', 'Orléans', 'https://www.facebook.com/groups/cgow.ca', 'en',
  'Groupe de quartier d’Orléans où des résidents demandent des recommandations de ménage.', null);
