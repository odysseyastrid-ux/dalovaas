-- "Mon plan" (owner's request, Nov 23, 2026): the marketing plan (STRATEGIE-MARKETING.md) as small
-- tasks shown one at a time on the dashboard home. The owner studies and works and has ADHD: every
-- task is short and precise, can be pushed back (tomorrow, 3 days, a week, a date) or skipped, and
-- the whole plan can be paused until a date. Late tasks are never shown as "late": they just come back.
create table if not exists plan_tasks (
  id text primary key check (char_length(id) <= 40),
  phase smallint not null,                      -- week of the plan (1 = first week)
  sort smallint not null default 0,
  title_fr text not null check (char_length(title_fr) <= 160),
  title_en text not null check (char_length(title_en) <= 160),
  steps_fr text not null default '' check (char_length(steps_fr) <= 1200),  -- one step per line
  steps_en text not null default '' check (char_length(steps_en) <= 1200),
  minutes smallint not null default 15 check (minutes between 1 and 240),
  repeat_days smallint check (repeat_days between 1 and 60),  -- recurring: comes back N days after "done"
  due_on date not null,
  status text not null default 'todo' check (status in ('todo', 'done', 'skipped')),
  done_at timestamptz,
  snoozes smallint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists plan_settings (
  id text primary key default 'main' check (id = 'main'),
  per_day smallint not null default 1 check (per_day between 1 and 3),
  paused_until date,
  pause_reason text check (char_length(pause_reason) <= 200),
  digest_was_on boolean,              -- the daily prospect email is paused with the plan, then restored
  updated_at timestamptz not null default now()
);
insert into plan_settings (id) values ('main') on conflict do nothing;

alter table plan_tasks enable row level security;
alter table plan_settings enable row level security;
create policy "admins manage the plan" on plan_tasks for all to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
create policy "admins manage the plan settings" on plan_settings for all to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant select, insert, update, delete on plan_tasks, plan_settings to authenticated;

insert into plan_tasks (id, phase, sort, due_on, minutes, repeat_days, title_fr, steps_fr, title_en, steps_en) values
-- Week 1: become visible for free
('google-1', 1, 1, '2026-11-24', 15, null,
 'Fiche Google (1/3) : catégorie et zones',
 E'Ouvrez business.google.com sur votre téléphone\nCatégorie principale : « Service de nettoyage résidentiel »\nAjoutez « Service de nettoyage commercial »\nZones desservies : Clarence-Rockland, Orléans, Ottawa, Gatineau\nCachez votre adresse (vous allez chez les clients)',
 'Google profile (1/3): category and areas',
 E'Open business.google.com on your phone\nMain category: "House cleaning service"\nAdd "Commercial cleaning service"\nService areas: Clarence-Rockland, Orléans, Ottawa, Gatineau\nHide your address (you go to the clients)'),
('google-2', 1, 2, '2026-11-25', 10, null,
 'Fiche Google (2/3) : la description',
 E'Tableau de bord → Croissance → Textes de profil\nCopiez le texte français, puis l''anglais en dessous\nCollez-les dans « Description » de la fiche Google\nEnregistrez',
 'Google profile (2/3): the description',
 E'Dashboard → Growth → Profile texts\nCopy the French text, then the English one below it\nPaste them in the Google profile "Description"\nSave'),
('google-3', 1, 3, '2026-11-26', 15, null,
 'Fiche Google (3/3) : 10 photos',
 E'Choisissez 10 photos avant/après (aucun visage, aucune adresse)\nFiche Google → Photos → Ajouter\nAjoutez aussi votre logo',
 'Google profile (3/3): 10 photos',
 E'Pick 10 before/after photos (no faces, no addresses)\nGoogle profile → Photos → Add\nAlso add your logo'),
('signup-homestars', 1, 4, '2026-11-27', 20, null,
 'Inscription gratuite sur HomeStars',
 E'homestars.com → « Join as a pro »\nCréez le compte vous-même (je ne gère jamais vos mots de passe)\nCollez le texte de profil (Croissance)\nAjoutez 5 photos\nCochez HomeStars dans Croissance',
 'Free sign-up on HomeStars',
 E'homestars.com → "Join as a pro"\nCreate the account yourself (I never handle your passwords)\nPaste the profile text (Growth)\nAdd 5 photos\nTick HomeStars in Growth'),
('signup-bark', 1, 5, '2026-11-28', 15, null,
 'Inscription gratuite sur Bark',
 E'bark.com → « Join as a professional »\nService : House cleaning · Zone : Ottawa et Clarence-Rockland\nCollez le texte de profil (Croissance)\nCochez Bark dans Croissance',
 'Free sign-up on Bark',
 E'bark.com → "Join as a professional"\nService: House cleaning · Area: Ottawa and Clarence-Rockland\nPaste the profile text (Growth)\nTick Bark in Growth'),
('signup-yelp-taskrabbit', 1, 6, '2026-11-29', 20, null,
 'Inscriptions Yelp et TaskRabbit',
 E'biz.yelp.ca → « Ajouter mon entreprise » (gratuit, sans publicité)\ntaskrabbit.ca → « Become a Tasker », catégorie ménage\nMême texte de profil et mêmes photos\nCochez TaskRabbit dans Croissance',
 'Yelp and TaskRabbit sign-ups',
 E'biz.yelp.ca → "Add my business" (free, no ads)\ntaskrabbit.ca → "Become a Tasker", cleaning category\nSame profile text and photos\nTick TaskRabbit in Growth'),
('fb-join', 1, 7, '2026-11-30', 10, null,
 'Rejoindre 3 groupes Facebook',
 E'Clients → Prospection → les « canaux »\nOuvrez chaque groupe et cliquez « Rejoindre »\nRépondez aux questions d''entrée\nGroupes : Ottawa Cleaning Services, Convent Glen / Orléans Wood, groupe de Rockland',
 'Join 3 Facebook groups',
 E'Clients → Prospecting → the "channels"\nOpen each group and click "Join"\nAnswer the entry questions\nGroups: Ottawa Cleaning Services, Convent Glen / Orléans Wood, Rockland group'),
('fb-reply', 1, 8, '2026-11-30', 10, 3,
 'Répondre aux nouvelles demandes de ménage',
 E'Ouvrez les groupes Facebook rejoints\nCherchez « cleaner », « ménage », « femme de ménage »\nRépondez avec une réponse prête (Croissance), signée « l''équipe »\nRépondre vite gagne : moins d''1 h si possible',
 'Reply to new cleaning requests',
 E'Open the Facebook groups you joined\nSearch "cleaner", "cleaning", "housekeeper"\nReply with a ready answer (Growth), signed "the team"\nSpeed wins: under 1 hour if you can'),
-- Week 2
('monday-review', 2, 0, '2026-11-30', 5, 7,
 'Bilan du lundi (5 minutes)',
 E'Accueil : combien de demandes de prix cette semaine ?\nCombien d''avis Google au total ?\nCombien de clients réguliers ?\nD''où viennent les clients (Google, Facebook, dépliant, parrainage) ?\nDites-le à Bulle : « Bilan : … »',
 'Monday check-in (5 minutes)',
 E'Home: how many quote requests this week?\nHow many Google reviews in total?\nHow many recurring clients?\nWhere do clients come from (Google, Facebook, flyer, referral)?\nTell Bulle: "Check-in: …"'),
('flyers-order', 2, 1, '2026-12-01', 20, null,
 'Commander 100 dépliants',
 E'vistaprint.ca ou Staples (Copy & Print)\nFormat carte postale ou affichette de porte\nTexte : « Ménage bilingue, fiable et local · 20 % sur le premier ménage »\nCode QR vers magicstickclean.ca/quote.html\nBudget : 25 à 40 $',
 'Order 100 flyers',
 E'vistaprint.ca or Staples (Copy & Print)\nPostcard or door-hanger format\nText: "Bilingual, reliable, local cleaning · 20% off the first clean"\nQR code to magicstickclean.ca/quote.html\nBudget: $25 to $40'),
('video-1', 2, 2, '2026-12-02', 10, null,
 'Filmer votre première vidéo (sans visage)',
 E'Au prochain ménage, demandez au client la permission de filmer\nFilmez la pièce AVANT : 5 secondes\nFilmez APRÈS, même angle : 5 secondes\nJamais de visage, d''adresse ni d''objets personnels',
 'Film your first video (no face)',
 E'At your next clean, ask the client for permission to film\nFilm the room BEFORE: 5 seconds\nFilm AFTER, same angle: 5 seconds\nNever faces, addresses or personal items'),
('video-1-post', 2, 3, '2026-12-03', 15, null,
 'Publier la vidéo avant/après',
 E'Application CapCut (gratuite) : mettez les 2 clips ensemble\nAjoutez le texte « Avant / Après » et une musique\nPubliez sur Facebook, Instagram et TikTok\nLégende : « Ménage à Rockland · soumission gratuite sur magicstickclean.ca »',
 'Post the before/after video',
 E'CapCut app (free): put the 2 clips together\nAdd the text "Before / After" and music\nPost on Facebook, Instagram and TikTok\nCaption: "Cleaning in Rockland · free quote at magicstickclean.ca"'),
('flyers-rockland-1', 2, 4, '2026-12-05', 30, null,
 'Dépliants à Rockland (1/2) : 50 portes',
 E'Un quartier de maisons (par exemple Morris Village)\n50 portes, environ 30 minutes\nRespectez les affiches « Pas de circulaires »\nNotez la rue dans Bulle pour la prochaine fois',
 'Flyers in Rockland (1/2): 50 doors',
 E'A neighbourhood of houses (for example Morris Village)\n50 doors, about 30 minutes\nRespect "No flyers" signs\nTell Bulle the street for next time'),
('flyers-rockland-2', 2, 5, '2026-12-06', 30, null,
 'Dépliants à Rockland (2/2) : 50 portes',
 E'Le quartier voisin du premier\n50 portes, environ 30 minutes\nRespectez les affiches « Pas de circulaires »',
 'Flyers in Rockland (2/2): 50 doors',
 E'The neighbourhood next to the first one\n50 doors, about 30 minutes\nRespect "No flyers" signs'),
-- Week 3
('reviews', 3, 1, '2026-12-08', 5, null,
 'Recevoir un avis après chaque ménage',
 E'Commandes → marquez « Terminé » après chaque ménage\nLe courriel de remerciement avec le lien d''avis part tout seul 2 h après\nNe jamais offrir de cadeau en échange d''un avis',
 'Get a review after every clean',
 E'Orders → mark "Done" after each clean\nThe thank-you email with the review link goes out by itself 2 hours later\nNever offer anything in exchange for a review'),
('flyers-orleans-1', 3, 2, '2026-12-09', 30, null,
 'Dépliants à Orléans (1/2) : 50 portes',
 E'Convent Glen, Avalon ou Chapel Hill\n50 portes, environ 30 minutes\nRespectez les affiches « Pas de circulaires »',
 'Flyers in Orléans (1/2): 50 doors',
 E'Convent Glen, Avalon or Chapel Hill\n50 doors, about 30 minutes\nRespect "No flyers" signs'),
('flyers-orleans-2', 3, 3, '2026-12-11', 30, null,
 'Dépliants à Orléans (2/2) : 50 portes',
 E'Un autre quartier d''Orléans\n50 portes, environ 30 minutes',
 'Flyers in Orléans (2/2): 50 doors',
 E'Another Orléans neighbourhood\n50 doors, about 30 minutes'),
('boards', 3, 4, '2026-12-12', 30, null,
 'Afficher sur 3 babillards',
 E'Épicerie, garderie, centre communautaire de Rockland\nDemandez la permission à l''accueil\nUn dépliant par babillard',
 'Post on 3 notice boards',
 E'Grocery store, daycare, Rockland community centre\nAsk the front desk for permission\nOne flyer per board'),
('holiday-post', 3, 5, '2026-12-13', 15, null,
 'Publication des fêtes : grand ménage et cartes-cadeaux',
 E'Dans les groupes Facebook et sur la fiche Google (« Ajouter une mise à jour »)\nTexte : « Grand ménage avant les fêtes · Offrez un ménage en carte-cadeau »\nLien : magicstickclean.ca/gift-cards.html\nAjoutez une photo avant/après',
 'Holiday post: deep clean and gift cards',
 E'In the Facebook groups and on the Google profile ("Add update")\nText: "Deep clean before the holidays · Give a cleaning as a gift card"\nLink: magicstickclean.ca/gift-cards.html\nAdd a before/after photo'),
-- Week 4
('referral-cards', 4, 1, '2026-12-15', 15, null,
 'Commander les cartes de parrainage',
 E'50 petites cartes (vistaprint.ca)\nTexte : « Parlez de nous : 20 $ pour vous, 20 $ pour votre ami »\nDonnez-en 2 à chaque client après le ménage',
 'Order the referral cards',
 E'50 small cards (vistaprint.ca)\nText: "Tell a friend: $20 for you, $20 for your friend"\nGive 2 to each client after the clean'),
('partners-1', 4, 2, '2026-12-16', 20, null,
 'Appeler 3 partenaires',
 E'Clients → Prospection → liste « Aujourd''hui »\n3 appels : agent immobilier, gestionnaire Airbnb, entrepreneur\nAprès chaque appel, cliquez le bon bouton (Contacté, Intéressé…)',
 'Call 3 partners',
 E'Clients → Prospecting → "Today" list\n3 calls: realtor, Airbnb manager, contractor\nAfter each call, click the right button (Contacted, Interested…)'),
('weekly-video', 4, 3, '2026-12-17', 20, 7,
 'La vidéo sans visage de la semaine',
 E'Idées : avant/après, une astuce (four, douche), le bruit satisfaisant du nettoyage\nToujours la permission du client, jamais de visage\nCapCut : texte et musique\nPubliez sur les 3 réseaux',
 'This week''s no-face video',
 E'Ideas: before/after, a tip (oven, shower), the satisfying sound of cleaning\nAlways the client''s permission, never faces\nCapCut: text and music\nPost on the 3 networks'),
('partners-2', 4, 4, '2026-12-18', 20, null,
 'Appeler 2 autres partenaires',
 E'Clients → Prospection → liste « Aujourd''hui »\n2 appels\nCliquez le bon bouton après chaque appel',
 'Call 2 more partners',
 E'Clients → Prospecting → "Today" list\n2 calls\nClick the right button after each call'),
('google-post', 4, 5, '2026-12-19', 10, 14,
 'Publication sur votre fiche Google',
 E'Fiche Google → « Ajouter une mise à jour »\nUne photo avant/après et 2 phrases\nTerminez par « Soumission gratuite : magicstickclean.ca »',
 'Post on your Google profile',
 E'Google profile → "Add update"\nOne before/after photo and 2 sentences\nEnd with "Free quote: magicstickclean.ca"'),
-- Month 2: turn first clients into recurring ones
('recurring-offer', 5, 1, '2026-12-22', 5, null,
 'Proposer le ménage régulier',
 E'Après chaque premier ménage, proposez : « Aux 2 semaines, avec 10 % de rabais »\nDemandez à Bulle : « Écris l''offre régulière pour [prénom] »\nEnvoyez-la le jour même',
 'Offer recurring cleaning',
 E'After every first clean, offer: "Every 2 weeks, 10% off"\nAsk Bulle: "Write the recurring offer for [first name]"\nSend it the same day'),
('new-year-post', 6, 1, '2026-12-29', 15, null,
 'Publication « ménage après les fêtes »',
 E'Groupes Facebook et fiche Google\nTexte : « Ménage après les fêtes · Commencez 2027 dans une maison propre »\nRappel : 20 % sur le premier ménage',
 'Post: "after-holidays cleaning"',
 E'Facebook groups and Google profile\nText: "After-holidays cleaning · Start 2027 in a clean home"\nReminder: 20% off the first clean'),
('hire', 8, 1, '2027-01-12', 20, null,
 'Préparer l''embauche (si vous avez 6 clients réguliers)',
 E'Pas encore 6 clients réguliers ? Cliquez « Plus tard » → 1 semaine\nSinon : partagez la page Carrières dans les groupes de Rockland et d''Orléans\nLes candidatures arrivent dans Équipe',
 'Get ready to hire (if you have 6 recurring clients)',
 E'Not 6 recurring clients yet? Click "Later" → 1 week\nOtherwise: share the Careers page in the Rockland and Orléans groups\nApplications arrive in Team'),
-- Month 3: speed up
('local-services', 10, 1, '2027-02-01', 30, null,
 'Tester Google Local Services (si 8 avis ou plus)',
 E'Moins de 8 avis ? Cliquez « Plus tard » → 1 semaine\nads.google.com/local-services-ads\nBudget maximum : 50 à 75 $ pour le mois\nGardez seulement si un client rapporte plus que le coût',
 'Test Google Local Services (8 reviews or more)',
 E'Fewer than 8 reviews? Click "Later" → 1 week\nads.google.com/local-services-ads\nMaximum budget: $50 to $75 for the month\nKeep it only if a client brings in more than it costs'),
('airbnb', 10, 2, '2027-02-03', 20, null,
 'Contacter 5 hôtes Airbnb ou gestionnaires',
 E'Clients → Prospection : catégorie Airbnb et gestion immobilière\nCourriel de présentation prêt (bouton dans la fiche)\nCliquez « Contacté » après chaque envoi',
 'Contact 5 Airbnb hosts or managers',
 E'Clients → Prospecting: Airbnb and property management\nReady intro email (button on the card)\nClick "Contacted" after each one'),
('offices', 11, 1, '2027-02-09', 20, null,
 'Contacter 5 petits bureaux ou commerces',
 E'Bureaux et boutiques de Rockland et d''Orléans\nProposez un ménage du soir, chaque semaine\nNotez chaque contact dans Prospection',
 'Contact 5 small offices or shops',
 E'Offices and shops in Rockland and Orléans\nOffer a weekly evening clean\nLog each contact in Prospecting')
on conflict (id) do nothing;

-- Bulle knows about the task system.
update ai_knowledge set content_fr = trim(coalesce(content_fr, '') || E'\n\n' ||
'MON PLAN (Accueil → « Mon plan ») : le plan est découpé en petites tâches de 5 à 30 minutes, une à la fois. La personne propriétaire étudie et travaille, et a un TDAH : proposer une seule petite tâche à la fois, des étapes précises, jamais de reproche quand une tâche est remise ou oubliée. Pendant les examens ou une semaine chargée, proposer le bouton « Pause » (le plan et le courriel quotidien des prospects s''arrêtent jusqu''à la date choisie).')
where id = 'owner' and content_fr not like '%MON PLAN (Accueil%';
