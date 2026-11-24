-- "Reports and plans" (owner's request, Nov 24, 2026): research reports and plans in French and
-- English, readable in the dashboard (Growth tab → Reports and plans, js/admin-docs.js). Admin only.
create table if not exists owner_docs (
  id text primary key check (char_length(id) <= 60),
  sort smallint not null default 0,
  title_fr text not null check (char_length(title_fr) <= 200),
  title_en text not null check (char_length(title_en) <= 200),
  body_fr text not null default '' check (char_length(body_fr) <= 60000),
  body_en text not null default '' check (char_length(body_en) <= 60000),
  updated_at timestamptz not null default now()
);
alter table owner_docs enable row level security;
drop policy if exists "admins manage their documents" on owner_docs;
create policy "admins manage their documents" on owner_docs for all to authenticated
  using (exists (select 1 from admin_users where id = auth.uid()))
  with check (exists (select 1 from admin_users where id = auth.uid()));
grant select, insert, update, delete on owner_docs to authenticated;

insert into owner_docs (id, sort, title_fr, title_en, body_fr, body_en) values ('best-cleaners-canada-2026', 1,
$doc$Les meilleurs ménages gagnent par la confiance$doc$, $doc$The best cleaners win on trust$doc$,
$doc$**Réponse courte :** les entreprises de ménage les mieux cotées au Canada ne gagnent pas avec un produit secret. Elles gagnent avec un système simple et répété : prix et réservation faciles, promesse de reprise si quelque chose est manqué, preuves de confiance (assurance, vérification des antécédents), rappels automatiques, et une demande d'avis envoyée à chaque client après chaque ménage. Le cas le mieux documenté est Hellamaid : réservation en ligne, **rappels SMS, demande de note après le ménage**, garantie « 100 % satisfaction », assurance de 5 M$ et vérification des antécédents annoncées sur son site, et une revendication de **4,8 sur Google avec plus de 3 000 avis** ([Hellamaid](https://hellamaid.ca/)). Bonne nouvelle : Magicstick Clean a déjà la plupart de ces briques (soumission gratuite, réservation et paiement en ligne, garantie de reprise, rappel la veille, courriel d'avis 2 h après). Les vrais écarts sont ailleurs : **les preuves de confiance** (assurance, règles claires de la garantie), **le volume d'avis** (1 avis contre des centaines) et **le français obligatoire à Gatineau**. Limite importante : les notes Google de la plupart des concurrents n'ont pas pu être vérifiées, et les chiffres de Hellamaid viennent de son propre site. Il n'y a donc pas de « classement officiel » ici, seulement des pratiques qui reviennent chez plusieurs entreprises.

## Les grands noms promettent la même chose : revenir et réparer

Presque toutes les entreprises vérifiées offrent une promesse de reprise, mais les délais changent. Merry Maids demande de les prévenir **dans les 24 heures** et revient « sans frais » ([Merry Maids](https://Www.merrymaids.com/why-us/our-worry-free-guarantee/), version américaine, version canadienne non confirmée). Molly Maid Canada parle de **deux jours ouvrables** pour signaler un problème et refaire la zone gratuitement ([Molly Maid](https://mollymaid.ca/?p=25), résumé de recherche). Hellamaid dit « si quelque chose est manqué, on revient le corriger », sans délai écrit sur la page lue ([Hellamaid](https://hellamaid.ca/)). Ce que ces entreprises ne publient presque jamais : les conditions exactes, la même personne à chaque visite, les photos de preuve ou les fenêtres d'arrivée.

La garantie seule ne suffit pas, parce que les clients se plaignent justement de son application. Sur Trustpilot, Hellamaid a une note de **4,4 sur 53 avis**, et les critiques parlent de zones oubliées, de reports de dernière minute, d'un service client difficile à joindre et d'une équipe arrivée environ une heure en retard ([Trustpilot](https://www.trustpilot.com/review/hellamaid.com)). Sur HomeStars à Toronto, les plaintes visent plusieurs entreprises : absences, retards, annulations la veille, remboursements difficiles ([HomeStars, exemple Scrubbi](https://homestars.com/companies/2898451-scrubbi/reviews/1153172)). Leçon pour Magicstick : être fiable (arriver à l'heure, prévenir, répondre vite, réparer sans discuter) vaut plus que de promettre beaucoup. Hellamaid répond à **100 % de ses avis négatifs** ([Trustpilot](https://www.trustpilot.com/review/hellamaid.com)), ce qui est une habitude gratuite à copier.

## Confiance affichée : assurance, antécédents, produits verts

Les entreprises les mieux présentées écrivent noir sur blanc ce qui rassure. Hellamaid annonce des nettoyeurs avec vérification des antécédents, une assurance de **5 M$**, des produits écologiques sur demande sans frais et une liste de contrôle publiée ([Hellamaid](https://hellamaid.ca/)). The Maids parle d'équipes formées, vérifiées et assurées, avec un processus en 22 étapes ([The Maids](https://www.maids.com/221)). Hire A Maid (Toronto) ajoute la couverture WSIB et l'assurance responsabilité sur son profil HomeStars ([HomeStars](https://sp-homer.homestars.com/companies/2808756-hire-a-maid)). Molly Maid met de l'avant les produits « 100 % biodégradables » et un service vert à part ([Molly Maid](https://www.mollymaid.ca)). Aucune entreprise trouvée ne mentionne la CNESST au Québec, donc ce n'est pas un standard visible. À noter aussi : ce sont des déclarations des entreprises elles-mêmes, pas des vérifications indépendantes.

Pour Magicstick, les produits écologiques sont déjà un point commun avec les grands. Le reste (assurance responsabilité, antécédents judiciaires) est à régler **avant** de l'écrire : on ne publie que ce qu'on a vraiment. Cette assurance compte aussi pour plus tard, car Google Services locaux demande une vérification d'entreprise, des antécédents et une preuve d'assurance, avec environ 3 à 4 semaines de délai ([Little Dragon Media](https://littledragon.ca/google-local-service-ads-canada/)).

## Prix et réservation : le modèle en ligne bat le modèle « on vous rappelle »

Deux familles existent. Les franchises (Molly Maid, Merry Maids, Ménage-Pro) sont sur soumission seulement, sans prix affiché, avec un formulaire ou une visite d'estimation ([Molly Maid](https://mollymaid.ca/), [Ménage-Pro](https://www.menagepro.ca/)). Les entreprises « en ligne d'abord » comme Hellamaid et Adèle Express donnent un prix tout de suite après un court questionnaire, puis on réserve et on paie en ligne ([Adèle Express](https://adeleexpress.com/)). Hellamaid affiche un forfait de base de **99 $ plus un ajustement selon chambres, salles de bain et pieds carrés** (par exemple 188 $ pour 1 chambre et 1 salle de bain, avant taxes), ou un tarif horaire de **59 $ par nettoyeur avec minimum de 3 heures**, et elle ne facture qu'après le ménage ([Hellamaid Toronto](https://hellamaid.ca/house-cleaning-service-toronto/)). Même dans ce cas, le prix n'apparaît qu'après avoir donné nom, courriel et téléphone : le « prix affiché » sert aussi à capter un contact.

Sur la vitesse, la meilleure preuve est indirecte et vient de fournisseurs de logiciels : répondre en moins de 5 minutes rend un contact environ 21 fois plus susceptible d'être qualifié, et les formulaires perdent beaucoup de conversions quand on ajoute des champs (18,2 % avec 1 champ, 8,1 % avec 5) ([Estimatty](https://www.estimatty.com/blog/how-to-improve-conversion-rates)). Ces chiffres ne sont pas propres au Canada ni au ménage, et je n'ai pas pu ouvrir les études d'origine. Aucune étude indépendante ne compare « prix affiché » et « soumission seulement » pour le ménage au Canada. Le choix de Magicstick de ne pas afficher de prix est donc défendable. Ce qui est mieux appuyé, c'est de **répondre vite et de garder le formulaire court**. Si le propriétaire voulait un jour tester une option intermédiaire, The Montreal Cleaners publie des fourchettes indicatives (25 à 45 $/h, minimum de visite 85 $) tout en exigeant une soumission écrite pour le prix exact ([The Montreal Cleaners](https://www.themontrealcleaners.ca/fr/honoraires-femme-menage-montreal-laval-longueuil/)). Comme repère, un nettoyeur seul à Ottawa facture environ **32 à 48 $/h** ([Biller.ca](https://biller.ca/pricing-guides/how-much-to-charge-house-cleaning-canada)).

Les règles courantes autour du prix sont claires : annulation gratuite avec **24 heures** d'avis chez Hellamaid, et rabais récurrent de **20 % (hebdo), 15 % (aux deux semaines) et 10 % (mensuel)** à partir de la 2e réservation ([Hellamaid Toronto](https://hellamaid.ca/house-cleaning-service-toronto/)). Biller.ca confirme des rabais de 10 à 20 % pour le récurrent ([Biller.ca](https://biller.ca/pricing-guides/how-much-to-charge-house-cleaning-canada)). Le rabais d'environ 10 % de Magicstick est donc dans la norme, au bas de la fourchette. Chez Hellamaid, **55 % des 5 311 rendez-vous** à Toronto étaient récurrents (données de l'entreprise) : le récurrent est le vrai moteur.

## Les avis : un système répété, jamais une récompense

Le nombre d'avis vient d'une habitude, pas d'un coup de chance. Hellamaid avait dépassé **500 avis Google 5 étoiles en 2022**, avec réservation en ligne et SMS de rappel et de demande de note ([Side Hustle School](https://sidehustleschool.com/episode/2026/)). Une entreprise américaine citée comme exemple a atteint **471 avis Google en environ 7 ans**, en demandant à chaque client, plusieurs fois : code QR sur la liste de contrôle laissée à la maison, lien dans les factures et les courriels, suivi hebdomadaire du nombre d'avis ([ZenMaid](https://www.zenmaid.com/magazine/how-to-get-hundreds-of-google-reviews-for-your-cleaning-business/)). Le conseil de délai est d'envoyer la demande **2 à 4 heures après le ménage**, avec un lien direct ([ZenMaid](https://www.zenmaid.com/magazine/what-to-know-about-automating-your-cleaning-business/)). Magicstick fait déjà exactement cela avec son courriel envoyé 2 heures après.

Les règles de Google sont strictes et il faut les respecter. Google interdit les avis liés à un paiement, un rabais ou un cadeau, et interdit de ne demander un avis qu'aux clients satisfaits ([Google, avis incités](https://support.google.com/contributionpolicy/answer/16597558?hl=en), [Google, contenu interdit](https://support.google.com/contributionpolicy/answer/7400114?hl=en)). Plusieurs sources américaines conseillent des ménages gratuits ou de l'argent aux employés pour chaque avis : à ne pas copier. Le bon modèle : **le même message, avec le même lien Google, envoyé à tous les clients**, un seul rappel poli, et aucun avantage lié à l'avis. Pour une petite entreprise, 10 à 20 avis solides changent déjà le portrait dans une ville, selon un guide du secteur (affirmation de fournisseur, non mesurée) ([ZenMaid](https://www.zenmaid.com/magazine/how-to-get-cleaning-business-clients/)).

## Canaux gratuits d'abord, et le français à Gatineau

Hellamaid a commencé en 2017 avec environ **600 $ de départ** (domaine, thème WordPress, logiciel de planification, petit budget Google Ads), en nettoyant 3 à 5 maisons par semaine sur ses heures de dîner et en distribuant des dépliants ([Side Hustle School](https://sidehustleschool.com/episode/2026/)). Pour un budget sous 100 $/mois, l'ordre le mieux appuyé est : fiche Google Business complète avec de vrais avis, site simple bien classé localement, dépliants et groupes de quartier, profil HomeStars gratuit, puis un petit budget Google, et seulement ensuite les annonces Google Services locaux. HomeStars payant est décrit autour de 200 $/mois ou plus, avec des pistes partagées entre plusieurs entreprises et un engagement de 12 mois, d'après des agences de marketing qui parlent surtout de métiers de la construction ([The Iconic Management](https://theiconicmanagement.ca/blog/is-homestars-worth-it-contractors-2026.html)). Le plan de 90 jours de Magicstick suit déjà cet ordre. Aucune source canadienne solide n'a été trouvée sur Bark, TaskRabbit, Facebook ou les vidéos pour le ménage : ces canaux restent à tester, pas à présumer.

Pour la vente du récurrent, les sources (surtout américaines) disent de proposer le plan **le jour même du premier ménage**, avec un jour et une fréquence précis, puis de faire un suivi au bout de 3 jours ([LeadDuo](https://www.leadduo.io/en/blog/recurring-cleaning-service-2026)). Aucune donnée canadienne de conversion n'existe dans ce qui a été trouvé.

Enfin, à Gatineau, la langue n'est pas qu'un avantage : c'est une règle. L'OQLF dit que toute entreprise qui exerce des activités au Québec doit pouvoir servir ses clients en français, par tous les moyens qu'elle utilise (téléphone, courriel, clavardage, réseaux sociaux) ([OQLF](https://www.oqlf.gouv.qc.ca/francisation/entreprises/langue-de-service.html)). Des résumés secondaires ajoutent que le site, les factures et la publicité doivent être en français ([Montreal Mailbox](https://montrealmailbox.ca/articles/fr/site-web-reseaux-sociaux-francais-loi-96)). Les recherches n'ont pas établi si cela s'applique tel quel à une entreprise basée en Ontario qui se déplace à Gatineau : **à confirmer avec l'OQLF**. Magicstick est déjà bilingue, donc l'écart est surtout de vérifier que chaque document client existe en français complet.

## Liste des écarts pour Magicstick Clean

Ce que Magicstick a déjà et qui égale les meilleurs : soumission gratuite avec réponse le jour même, réservation et paiement en ligne, rabais récurrent proche de la norme, garantie de reprise, produits écologiques, rappel la veille, courriel d'avis 2 h après, cartes-cadeaux.

Écarts à régler, du plus important au moins important :

| # | Écart | Ce que font les meilleurs | Pourquoi ça compte |
|---|---|---|---|
| 1 | Volume d'avis : 1 avis (5,0), 0 client payant | Centaines d'avis, demande répétée à chaque client | Les avis font « la majorité du travail » de vente |
| 2 | Assurance responsabilité civile : non confirmée | Assurance affichée (5 M$ chez Hellamaid) | Rassure le client; requise pour Google Services locaux |
| 3 | Règles de la garantie non écrites (délai, comment signaler) | Délai de 24 h à 2 jours ouvrables, annoncé | Évite les disputes, rend la promesse crédible |
| 4 | Vérification des antécédents : à décider | Souvent affichée comme preuve de confiance | À n'afficher que si c'est fait pour de vrai |
| 5 | Français complet pour Gatineau (site, soumission, facture, reçu, courriels) | Obligation OQLF | Risque légal et confiance locale; à confirmer avec l'OQLF |
| 6 | Liste de contrôle publiée du ménage | Hellamaid (liste complète), The Maids (22 étapes) | Montre ce qui est inclus, réduit les « zones oubliées » |
| 7 | Politique d'annulation et de reprogrammation écrite | 24 h d'avis gratuit (Hellamaid) | Évite les plaintes les plus fréquentes |
| 8 | Proposition du plan récurrent le jour du premier ménage | Conseillé dans les sources sectorielles | Le récurrent est le moteur (55 % chez Hellamaid) |
| 9 | Réponse aux avis (bons et mauvais) | Hellamaid répond à tous les avis négatifs | Habitude gratuite qui rassure |
| 10 | Pas de prix indicatif visible (choix du propriétaire, à respecter) | Hellamaid affiche; franchises non | Option seulement : voir action 12 |

## Actions concrètes (courtes et précises)

**Cette semaine (moins de 3 h au total)**

1. Appeler un courtier ou assureur et demander une **assurance responsabilité civile** pour le ménage résidentiel. Écrire la réponse et le prix. N'afficher « assuré » sur le site qu'une fois la preuve en main.
2. Écrire la **garantie en 3 phrases** sur le site : « Prévenez-nous dans les 24 heures. On revient refaire la zone sans frais. » Choisir le délai (24 h ou 48 h) et l'écrire partout pareil (site, soumission, courriel).
3. Ajouter une **politique d'annulation** d'une phrase (ex. 24 h d'avis sans frais), dans la soumission et le courriel de la veille.
4. Vérifier que le site, la soumission, la facture, le reçu et les courriels existent **en français complet** (et en anglais). Poser la question à l'OQLF par courriel pour le cas Ontario-Gatineau.

**Ce mois-ci**

5. Publier la **liste de contrôle** du ménage standard sur le site (une page simple, 10 à 20 lignes).
6. Garder le courriel d'avis 2 h après, **pour tous les clients sans exception**, avec un seul rappel poli. Aucun rabais, cadeau ou concours lié à l'avis. Ne jamais filtrer qui reçoit le lien.
7. Mettre le lien d'avis Google dans les factures, reçus et la signature de courriel. Ajouter un code QR sur une carte de remerciement laissée à la maison (sans photo de visage).
8. Après le premier ménage, envoyer le jour même une offre de plan récurrent avec **jour et fréquence précis** (« aux deux semaines, le mardi »), et un suivi à 3 jours. Seulement aux clients qui ont déjà demandé un service (consentement LCAP respecté).
9. Répondre à **chaque avis Google** dans les 48 h, en français ou en anglais selon l'avis.
10. Suivre un chiffre par semaine : nombre d'avis Google. Objectif réaliste de départ : **10 avis réels**, puis 20.

**Plus tard (quand les bases sont prêtes)**

11. Décider pour les antécédents judiciaires : si le propriétaire le fait (ou le fait pour un futur employé), l'écrire; sinon, ne rien afficher.
12. **Option, pas obligation** : tester une phrase « à partir de ... $ » ou une fourchette sur le site (comme The Montreal Cleaners), ou garder la soumission seulement. Les preuves sur l'effet du prix affiché sont faibles; la rapidité de réponse et un formulaire court sont mieux appuyés.
13. Google Services locaux : seulement après 8 avis ou plus **et** assurance en main, avec 3 à 4 semaines de délai de vérification.
14. Mesurer chaque canal (Google, dépliants QR, groupes Facebook, HomeStars gratuit) pendant 90 jours avant de dépenser plus de 100 $/mois.

## Conclusion

Le constat le plus utile est que l'écart entre Magicstick et les meilleurs n'est pas la qualité du service ni les outils : c'est la **preuve visible**. Les grandes entreprises transforment leurs promesses en choses vérifiables (assurance écrite, délai de garantie écrit, liste de contrôle publique, centaines d'avis) et répondent à leurs critiques. Magicstick peut en copier la plus grande partie sans dépenser, en quelques semaines. Deux limites restent : les chiffres de Hellamaid sont ses propres déclarations, et plusieurs conseils chiffrés viennent de fournisseurs de logiciels américains; il faut les traiter comme des repères, pas comme des preuves canadiennes.

Ensuite, le plus gros levier de croissance est probablement le **récurrent** plus un flux régulier d'avis honnêtes, pas un budget de publicité. À l'inverse, les erreurs à éviter sont connues : promettre plus qu'on peut tenir, arriver en retard, et tout ce qui ressemble à acheter ou filtrer des avis. Ces fautes coûtent plus cher à une petite entreprise que de ne pas avoir de rabais ou de prix affiché.$doc$,
$doc$**Short answer:** Canada's best-rated cleaning companies don't win with a secret product. They win with a simple system they repeat every time: easy pricing and booking, a promise to come back if something was missed, proof of trust (insurance, background checks), automatic reminders, and a review request sent to every client after every clean. The best-documented case is Hellamaid: online booking, **SMS reminders, a review request after the clean**, a "100% satisfaction" guarantee, $5M insurance and background checks announced on its website, and a claim of **4.8 on Google with over 3,000 reviews** ([Hellamaid](https://hellamaid.ca/)). The good news: Magicstick Clean already has most of these building blocks (free quote request, online booking and payment, re-clean guarantee, day-before reminder, review email 2 h after). The real gaps are elsewhere: **proof of trust** (insurance, clear guarantee rules), **review volume** (1 review versus hundreds), and **mandatory French in Gatineau**. Important limit: most competitors' Google ratings could not be verified, and Hellamaid's figures come from its own website. So there is no "official ranking" here, only practices that show up across several companies.

## The big names all promise the same thing: come back and fix it

Almost all the companies we checked offer a re-clean promise, but the timelines differ. Merry Maids asks to be told **within 24 hours** and comes back "at no charge" ([Merry Maids](https://Www.merrymaids.com/why-us/our-worry-free-guarantee/), US version, Canadian version not confirmed). Molly Maid Canada refers to **two business days** to report a problem and redo the area for free ([Molly Maid](https://mollymaid.ca/?p=25), search summary). Hellamaid says "if something is missed, we come back and fix it", with no written deadline on the page we read ([Hellamaid](https://hellamaid.ca/)). What these companies almost never publish: the exact conditions, the same person on every visit, proof photos, or arrival windows.

The guarantee alone is not enough, because clients complain precisely about how it is applied. On Trustpilot, Hellamaid has a **4.4 rating from 53 reviews**, and the complaints mention forgotten areas, last-minute postponements, a customer service line that is hard to reach, and a crew arriving about an hour late ([Trustpilot](https://www.trustpilot.com/review/hellamaid.com)). On HomeStars in Toronto, complaints target several companies: no-shows, delays, cancellations the day before, and difficult refunds ([HomeStars, Scrubbi example](https://homestars.com/companies/2898451-scrubbi/reviews/1153172)). Lesson for Magicstick: being reliable (arriving on time, giving notice, answering fast, fixing things without arguing) is worth more than promising a lot. Hellamaid replies to **100% of its negative reviews** ([Trustpilot](https://www.trustpilot.com/review/hellamaid.com)), which is a free habit worth copying.

## Visible trust: insurance, background checks, green products

The best-presented companies put what reassures in black and white. Hellamaid advertises cleaners with background checks, **$5M** in insurance, eco-friendly products on request at no charge, and a published checklist ([Hellamaid](https://hellamaid.ca/)). The Maids talks about trained, vetted and insured teams, with a 22-step process ([The Maids](https://www.maids.com/221)). Hire A Maid (Toronto) adds WSIB coverage and liability insurance to its HomeStars profile ([HomeStars](https://sp-homer.homestars.com/companies/2808756-hire-a-maid)). Molly Maid highlights "100% biodegradable" products and a separate green service ([Molly Maid](https://www.mollymaid.ca)). No company found mentions the CNESST in Quebec, so this is not a visible standard. Also note: these are the companies' own statements, not independent verifications.

For Magicstick, eco-friendly products are already something it has in common with the big players. The rest (liability insurance, criminal background checks) must be sorted **before** it is advertised: you only publish what you really have. This insurance also matters later, because Google Local Services requires a business verification, background checks and proof of insurance, with about 3 to 4 weeks of wait time ([Little Dragon Media](https://littledragon.ca/google-local-service-ads-canada/)).

## Pricing and booking: the online model beats "we'll call you back"

Two models exist. Franchises (Molly Maid, Merry Maids, Ménage-Pro) are quote-only, with no price shown, using a form or an estimate visit ([Molly Maid](https://mollymaid.ca/), [Ménage-Pro](https://www.menagepro.ca/)). "Online first" companies like Hellamaid and Adèle Express give a price right away after a short questionnaire, then you book and pay online ([Adèle Express](https://adeleexpress.com/)). Hellamaid shows a base package of **$99 plus an adjustment for bedrooms, bathrooms and square footage** (for example $188 for 1 bedroom and 1 bathroom, before taxes), or an hourly rate of **$59 per cleaner with a 3-hour minimum**, and it only charges after the clean ([Hellamaid Toronto](https://hellamaid.ca/house-cleaning-service-toronto/)). Even then, the price only appears after you give your name, email and phone number: the "shown price" also serves to capture a contact.

On speed, the best evidence is indirect and comes from software vendors: responding within 5 minutes makes a lead about 21 times more likely to be qualified, and forms lose a lot of conversions as fields are added (18.2% with 1 field, 8.1% with 5) ([Estimatty](https://www.estimatty.com/blog/how-to-improve-conversion-rates)). These figures are not specific to Canada or to cleaning, and I could not open the original studies. No independent study compares "price shown" and "quote only" for cleaning in Canada. Magicstick's choice not to display a price is therefore defensible. What is better supported is **responding quickly and keeping the form short**. If the owner ever wanted to test a middle option, The Montreal Cleaners publishes indicative ranges ($25 to $45/h, $85 minimum visit) while still requiring a written quote for the exact price ([The Montreal Cleaners](https://www.themontrealcleaners.ca/fr/honoraires-femme-menage-montreal-laval-longueuil/)). As a benchmark, a solo cleaner in Ottawa charges about **$32 to $48/h** ([Biller.ca](https://biller.ca/pricing-guides/how-much-to-charge-house-cleaning-canada)).

The usual rules around price are clear: free cancellation with **24 hours'** notice at Hellamaid, and recurring discounts of **20% (weekly), 15% (every two weeks) and 10% (monthly)** starting from the 2nd booking ([Hellamaid Toronto](https://hellamaid.ca/house-cleaning-service-toronto/)). Biller.ca confirms 10 to 20% discounts for recurring service ([Biller.ca](https://biller.ca/pricing-guides/how-much-to-charge-house-cleaning-canada)). Magicstick's discount of about 10% is therefore within the norm, at the low end of the range. At Hellamaid, **55% of its 5,311 appointments** in Toronto were recurring (company data): recurring service is the real engine.

## Reviews: a repeated system, never a reward

The number of reviews comes from a habit, not luck. Hellamaid passed **500 five-star Google reviews in 2022**, with online booking and reminder and review-request texts ([Side Hustle School](https://sidehustleschool.com/episode/2026/)). A US company cited as an example reached **471 Google reviews in about 7 years** by asking every client, several times: a QR code on the checklist left at home, a link in invoices and emails, and weekly tracking of the review count ([ZenMaid](https://www.zenmaid.com/magazine/how-to-get-hundreds-of-google-reviews-for-your-cleaning-business/)). The timing advice is to send the request **2 to 4 hours after the clean**, with a direct link ([ZenMaid](https://www.zenmaid.com/magazine/what-to-know-about-automating-your-cleaning-business/)). Magicstick already does exactly this with its email sent 2 hours later.

Google's rules are strict and must be respected. Google prohibits reviews linked to a payment, discount or gift, and prohibits asking for reviews only from satisfied customers ([Google, incentivized reviews](https://support.google.com/contributionpolicy/answer/16597558?hl=en), [Google, prohibited content](https://support.google.com/contributionpolicy/answer/7400114?hl=en)). Several US sources advise free cleanings or cash to employees for each review: don't copy that. The right model: **the same message, with the same Google link, sent to every client**, one polite reminder, and no benefit tied to the review. For a small business, 10 to 20 solid reviews already change the picture in a city, according to an industry guide (vendor claim, not measured) ([ZenMaid](https://www.zenmaid.com/magazine/how-to-get-cleaning-business-clients/)).

## Free channels first, and French in Gatineau

Hellamaid started in 2017 with about **$600 in startup costs** (domain, WordPress theme, scheduling software, a small Google Ads budget), cleaning 3 to 5 homes per week during its lunch hours and handing out flyers ([Side Hustle School](https://sidehustleschool.com/episode/2026/)). For a budget under $100/month, the best-supported order is: a complete Google Business Profile with real reviews, a simple well-ranked local website, flyers and neighbourhood groups, a free HomeStars profile, then a small Google budget, and only then Google Local Services ads. Paid HomeStars is described at around $200/month or more, with leads shared among several businesses and a 12-month commitment, according to marketing agencies that mostly talk about construction trades ([The Iconic Management](https://theiconicmanagement.ca/blog/is-homestars-worth-it-contractors-2026.html)). Magicstick's 90-day plan already follows this order. No solid Canadian source was found for Bark, TaskRabbit, Facebook or videos for cleaning: these channels still need to be tested, not assumed to work.

To sell recurring service, the sources (mostly American) say to offer the plan **on the same day as the first clean**, with a specific day and frequency, then follow up after 3 days ([LeadDuo](https://www.leadduo.io/en/blog/recurring-cleaning-service-2026)). No Canadian conversion data was found in what was reviewed.

Finally, in Gatineau, language is not just an advantage: it is a rule. The OQLF (Office québécois de la langue française) says that any business operating in Quebec must be able to serve its clients in French, through all the channels it uses (phone, email, chat, social media) ([OQLF](https://www.oqlf.gouv.qc.ca/francisation/entreprises/langue-de-service.html)). Secondary summaries add that the website, invoices and advertising must be in French ([Montreal Mailbox](https://montrealmailbox.ca/articles/fr/site-web-reseaux-sociaux-francais-loi-96)). The research did not establish whether this applies as-is to an Ontario-based business that travels to Gatineau: **to be confirmed with the OQLF**. Magicstick is already bilingual, so the gap is mainly checking that every client document exists in full French.

## Gap list for Magicstick Clean

What Magicstick already has that matches the best: free quote with same-day reply, online booking and payment, recurring discount close to the norm, re-clean guarantee, eco-friendly products, day-before reminder, review email 2 hours later, gift cards.

Gaps to close, from most to least important:

| # | Gap | What the best do | Why it matters |
|---|---|---|---|
| 1 | Review volume: 1 review (5.0), 0 paying clients | Hundreds of reviews, repeated request to every client | Reviews do most of the selling work |
| 2 | Liability insurance: not confirmed | Insurance displayed ($5M at Hellamaid) | Reassures clients; required for Google Local Services |
| 3 | Guarantee rules not written (deadline, how to report) | Deadline of 24 h to 2 business days, announced | Avoids disputes, makes the promise credible |
| 4 | Background checks: to be decided | Often shown as a trust signal | Only display if actually done |
| 5 | Full French for Gatineau (website, quote, invoice, receipt, emails) | OQLF requirement | Legal risk and local trust; confirm with OQLF |
| 6 | Published standard cleaning checklist | Hellamaid (full list), The Maids (22 steps) | Shows what's included, reduces "forgotten areas" |
| 7 | Written cancellation and rescheduling policy | 24 h free notice (Hellamaid) | Avoids the most frequent complaints |
| 8 | Offer recurring plan on the day of the first clean | Recommended in industry sources | Recurring is the engine (55% at Hellamaid) |
| 9 | Replies to reviews (good and bad) | Hellamaid replies to all negative reviews | Free habit that reassures |
| 10 | No visible indicative price (owner's choice, to respect) | Hellamaid shows; franchises don't | Option only: see action 12 |

## Concrete actions (short and specific)

**This week (under 3 hours total)**

1. Call a broker or insurer and ask for **liability insurance** for residential cleaning. Write down the answer and the price. Only show "insured" on the website once you have the proof in hand.
2. Write the **guarantee in 3 sentences** on the website: "Tell us within 24 hours. We'll come back and redo the area at no charge." Choose the deadline (24 h or 48 h) and write it the same way everywhere (website, quote, email).
3. Add a one-sentence **cancellation policy** (for example, 24 h notice at no charge), in the quote and the day-before email.
4. Check that the website, quote, invoice, receipt and emails exist in **full French** (and English). Ask the OQLF by email about the Ontario-Gatineau case.

**This month**

5. Publish the standard cleaning **checklist** on the website (a simple page, 10 to 20 lines).
6. Keep the review email sent 2 hours after, **for all clients without exception**, with a single polite reminder. No discount, gift or contest tied to the review. Never filter who receives the link.
7. Put the Google review link on invoices, receipts and email signatures. Add a QR code on a thank-you card left at home (no face photo).
8. After the first clean, send a recurring plan offer the same day with **a specific day and frequency** ("every two weeks, Tuesdays"), and a follow-up at 3 days. Only to clients who already requested a service (CASL consent respected).
9. Reply to **every Google review** within 48 h, in French or English depending on the review.
10. Track one number per week: number of Google reviews. Realistic starting goal: **10 real reviews**, then 20.

**Later (once the basics are ready)**

11. Decide on criminal background checks: if the owner does them (or does them for a future employee), state it; otherwise, show nothing.
12. **Option, not obligation**: test a "from $... " phrase or a range on the website (like The Montreal Cleaners), or keep quote-only. Evidence on the effect of showing prices is weak; fast response and a short form are better supported.
13. Google Local Services: only after 8 or more reviews **and** insurance in hand, with a 3 to 4 week verification wait.
14. Measure each channel (Google, QR flyers, Facebook groups, free HomeStars) for 90 days before spending more than $100/month.

## Conclusion

The most useful finding is that the gap between Magicstick and the best is not service quality or tools: it is **visible proof**. The big companies turn their promises into things that can be verified (written insurance, written guarantee deadline, public checklist, hundreds of reviews) and respond to their critics. Magicstick can copy most of this without spending money, within a few weeks. Two limits remain: Hellamaid's figures are its own claims, and several numeric recommendations come from American software vendors; treat them as benchmarks, not as Canadian evidence.

Next, the biggest growth lever is probably **recurring** service plus a steady flow of honest reviews, not an advertising budget. Conversely, the known mistakes to avoid are: promising more than you can deliver, arriving late, and anything resembling buying or filtering reviews. These mistakes cost a small business more than not offering a discount or showing a price.$doc$)
on conflict (id) do update set title_fr = excluded.title_fr, title_en = excluded.title_en,
  body_fr = excluded.body_fr, body_en = excluded.body_en, updated_at = now();
