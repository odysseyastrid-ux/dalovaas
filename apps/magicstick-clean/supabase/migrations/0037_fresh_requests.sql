-- Fresh public requests (owner's request, Nov 23, 2026): the requests added on
-- Nov 23 (0034) pointed to old posts; they are replaced by posts from November
-- 2026 found on Facebook groups and Reddit. Link + short summary only, never the
-- person's name or contact; the owner answers on the platform (CASL).
-- Owner's decision (Nov 23, 2026): messages are signed "the Magicstick Clean team", not "Louis".
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
  'Hi! This is the Magicstick Clean team, a local cleaning business in Ottawa. December 3rd works for us. Send us the size of the home (bedrooms, bathrooms) and a few photos, and we''ll give you a clear price the same day. Supplies included. Text 343-843-7761 or get a free quote at magicstickclean.ca 🙂'),
 ('Orléans : service de ménage régulier recherché', 'request', 'Orléans', 'https://www.facebook.com/groups/966074270589479/posts/2461527517710806/', 'en',
  'Publié en novembre 2026 : ménage général (fenêtres et planchers au besoin), pas de lavage ni de cuisine, maison sans fumée.',
  'Hi! This is the Magicstick Clean team, based right next to Orléans. General cleaning with windows and floors as needed is exactly what we do, weekly, every two weeks or monthly, with all supplies included. Tell us the size of the home and how often you''d like it, and we''ll send you a clear price. Text us at 343-843-7761 🙂'),
 ('Orléans (Convent Glen) : grand ménage d’une maison 4 chambres', 'request', 'Orléans', 'https://www.facebook.com/groups/cgow.ca/posts/28084121017927574/', 'en',
  'Publié en novembre 2026 dans le groupe de Convent Glen / Orléans Wood : maison 4 chambres, 2,5 salles de bain, un ménage ponctuel. Vérifier si c’est encore à faire (date visée : mi-novembre).',
  'Hi! This is the Magicstick Clean team, a local cleaning business in Orléans. If you still need it, we can do a one-time clean of your 4-bedroom, 2.5-bath home, supplies included, with a clear price before booking. We''re also happy to help before the holidays. Text 343-843-7761 or magicstickclean.ca 🙂'),
 ('Femme de ménage fiable avec références (groupe bilingue)', 'request', 'Ottawa–Gatineau', 'https://www.facebook.com/groups/1074514452558956/posts/29867588989491452/', 'fr',
  'Publié en novembre 2026 : cherche une femme de ménage fiable avec références (message en français et en anglais). Vérifier la ville dans la publication.',
  'Bonjour ! Ici l’équipe Magicstick Clean, une entreprise de ménage locale à Clarence-Rockland, Orléans, Ottawa et Gatineau. Nous travaillons avec nos propres produits, nous répondons le jour même et vous recevez un prix clair avant de réserver. Textez-nous au 343-843-7761 🙂'),
 ('Reddit r/ottawa : « Cleaner recommendations »', 'request', 'Ottawa', 'https://www.reddit.com/r/ottawa/comments/1xeg1iv/cleaner_recommendations/', 'en',
  'Discussion de novembre 2026 où des gens d’Ottawa cherchent une personne pour le ménage. Lire les règles du sous-forum avant de répondre (la publicité y est souvent limitée).',
  'Hi! The Magicstick Clean team here, a local cleaning business (Orléans/Rockland/Ottawa/Gatineau). We bring all supplies, reply the same day and give a clear price before anything is booked. Happy to answer questions here or by text at 343-843-7761.'),
 ('Groupe Facebook « Ottawa Cleaning Services »', 'channel', 'Ottawa', 'https://www.facebook.com/groups/966074270589479', 'en',
  'Groupe très actif : plusieurs demandes de ménage par semaine (Orléans, Ottawa). À rejoindre et à vérifier chaque jour.', null),
 ('Groupe Facebook Convent Glen / Orléans Wood', 'channel', 'Orléans', 'https://www.facebook.com/groups/cgow.ca', 'en',
  'Groupe de quartier d’Orléans où des résidents demandent des recommandations de ménage.', null);

-- Older ready replies: same signature change.
update prospects set reply_text = replace(replace(reply_text,
  'I''m Louis from Magicstick Clean', 'This is the Magicstick Clean team'),
  'Je suis Louis de Magicstick Clean', 'Ici l’équipe Magicstick Clean')
where reply_text like '%Louis%';

-- Marketing plan for Bulle (owner's notes, read by owner-agent). Full plan: STRATEGIE-MARKETING.md.
insert into ai_knowledge (id, content_fr) values ('owner', $plan$
PLAN MARKETING (décidé le 23 nov. 2026, jusqu'à fin février 2027) — suivre ce plan avec la propriétaire.
Départ : 0 client payant, 1 avis Google, presque aucune visite venant de Google. Problème = visibilité.
Décisions : 3 à 5 h/semaine de marketing ; moins de 100 $/mois ; tous types de clients ; objectif 10 clients réguliers et plus fin février ; embaucher un aide à temps partiel dès 6 réguliers ; JAMAIS montrer le visage de la propriétaire (vidéos des mains, du travail, avant/après seulement) ; dépliants 1 h/semaine ; parrainage 20 $ pour celui qui parraine + 20 $ pour le nouveau client ; signer « l'équipe Magicstick Clean » (jamais « Louis »).
Message : ménage bilingue, fiable et local, de Rockland à Gatineau ; réponse le jour même ; prix clair avant de réserver ; reprise gratuite.
Concurrents : Done Right (545 avis), Mambo (280), Merry Maids (231), Glebe Clean (207), Hellamaid (166), Molly Maid (155) dominent Orléans/Ottawa grâce aux avis Google. Presque tous en anglais seulement. Clarence-Rockland : presque personne de visible = territoire à gagner en premier. Prix du marché 30 à 55 $/h par personne (BlueGuard 50 $/h, min. 3 h) ; plancher de la propriétaire 39,50 $/h.
Semaine 1 : fiche Google complète (catégories, zones, description bilingue, 10 photos) ; inscriptions HomeStars, Bark, TaskRabbit, Yelp (elle les crée elle-même) ; rejoindre les groupes Facebook et répondre aux demandes.
Semaine 2 : 100 dépliants avec code QR à Rockland ; 2 premiers clients avec les 20 % ; 1 vidéo sans visage.
Semaine 3 : demander un avis après chaque ménage (jamais de cadeau en échange) ; 100 dépliants à Orléans ; 3 babillards.
Semaine 4 : cartes de parrainage ; 5 appels de partenaires (immobilier, Airbnb, entrepreneurs) ; 1 publication Google + 1 vidéo.
Mois 2 : proposer le plan régulier après chaque premier ménage ; campagne des fêtes (grand ménage, cartes-cadeaux) ; 2 vidéos/semaine ; répondre en moins d'1 h dans les groupes. Objectif 6 réguliers, 8 avis, puis recruter.
Mois 3 : avec 8 avis ou plus, tester Google Local Services, plafond 50 à 75 $ ; viser Airbnb et petits bureaux. Objectif 10 réguliers et plus, 12 à 15 avis.
Chaque lundi : demandes de prix, taux de oui, avis Google, clients réguliers, source des clients.
Chaque jour, quand elle demande quoi faire : donner les 1 à 3 prochaines actions du plan selon la semaine en cours et ce qui est déjà fait.
$plan$)
on conflict (id) do update set content_fr = trim(coalesce(ai_knowledge.content_fr, '') || E'\n\n' || excluded.content_fr);
