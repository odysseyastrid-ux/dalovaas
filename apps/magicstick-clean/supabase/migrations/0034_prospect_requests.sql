-- Public requests from individuals ("looking for a cleaner" posts), Nov 23, 2026.
-- Only the link to the public post and a short summary are stored, never the
-- person's name or contact: the owner answers on the platform where they asked.
alter table prospects drop constraint if exists prospects_category_check;
alter table prospects add constraint prospects_category_check
  check (category in ('request', 'agency', 'airbnb', 'property', 'realtor', 'contractor', 'channel'));

insert into prospects (name, category, area, website, lang, notes) values
 ('Rockland : une entreprise cherche une équipe de ménage', 'request', 'Rockland', 'https://www.facebook.com/groups/777450978950234/posts/6172153746146570/', 'en', 'Entreprise locale : équipe de 4–5 personnes, environ 5 h, un lundi sur deux. Vérifier que l’annonce est encore active.'),
 ('Rockland : nouveaux résidents cherchent une femme de ménage', 'request', 'Rockland', 'https://www.facebook.com/groups/777450978950234/posts/9141935415835040/', 'en', 'Demande de recommandations pour un service de ménage.'),
 ('Rockland : garage à nettoyer rapidement', 'request', 'Rockland', 'https://www.facebook.com/groups/777450978950234/posts/9175333999161848/', 'en', 'Demande urgente (« ASAP ») pour vider et nettoyer un garage.'),
 ('Rockland : quels services de ménage à domicile ?', 'request', 'Rockland', 'https://www.facebook.com/groups/1010165606896370/posts/1331671528079108/', 'en', 'Une personne cherche un service de ménage à domicile.'),
 ('Rockland : ménage mensuel recherché', 'request', 'Rockland', 'https://www.facebook.com/groups/1146481795392382/posts/29083528181261035/', 'en', 'Demande de ménage une fois par mois. Vérifier qu’il s’agit bien de Rockland (Ontario).'),
 ('Ottawa : « house cleaner wanted » (Kijiji)', 'request', 'Ottawa', 'https://www.kijiji.ca/v-cleaning-housekeeper-jobs/ottawa/house-cleaner-wanted/1746256785', 'en', 'Annonce Kijiji d’une personne qui cherche quelqu’un pour son ménage.'),
 ('Ottawa (Riverside Dr) : ménage à temps partiel recherché (Kijiji)', 'request', 'Ottawa', 'https://www.kijiji.ca/v-cleaning-housekeeper-jobs/ottawa/part-time-home-cleaner-wanted/1743945427', 'en', 'Annonce Kijiji : ménage à domicile à temps partiel.'),
 ('Groupe Facebook de Rockland (communauté)', 'channel', 'Rockland', 'https://www.facebook.com/groups/777450978950234', 'en', 'Les résidents y demandent des recommandations. Publier une courte présentation (avec photos avant/après) et répondre aux demandes.'),
 ('Rockland Community info (groupe Facebook)', 'channel', 'Rockland', 'https://www.facebook.com/groups/721600330601837', 'en', 'Environ 1 000 membres ; d’autres entreprises de ménage y publient leurs offres.'),
 ('TaskRabbit Canada', 'channel', 'Ottawa', 'https://www.taskrabbit.ca/', 'en', 'S’inscrire comme Tasker (ménage) : les particuliers y réservent directement.'),
 ('HomeStars – Ottawa', 'channel', 'Ottawa', 'https://www.homestars.com/cleaning/cleaning-company-pros/ottawa', 'en', 'Créer la fiche de l’entreprise : les propriétaires y comparent les entreprises de ménage.'),
 ('Bark', 'channel', 'Ottawa–Gatineau', 'https://www.bark.com', 'en', 'Les particuliers y publient leurs demandes de ménage ; les entreprises paient pour y répondre. Comparer le prix avant.');
