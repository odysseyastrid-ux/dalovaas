# Plan des connexions : Magicstick Clean

Date : 23 novembre 2026. Statut : plan à exécuter après vos examens.

Vos outils (Gmail, Google, Facebook, Instagram) seront reliés au tableau de bord admin, en 5 phases.
Bulle prépare les actions, et vous confirmez chacune d'un clic. Rien ne part vers un client sans votre accord.
Chaque tâche prend 10 à 20 minutes et a des étapes précises. Cochez-les au fur et à mesure.

## Vos décisions

| Sujet | Décision |
|---|---|
| Outils à connecter | Gmail, Google Business Profile, Google Analytics 4, Search Console, Google Agenda, Facebook et Instagram |
| Autonomie de Bulle | Bulle prépare, vous confirmez. Aucun envoi à un client sans clic (loi CASL) |
| Google Cloud | Plus tard, après vos examens |
| Aussi voulu | Résumé du matin, alerte nouvel avis Google, suivi des dépenses et du profit, factures et reçus PDF |

## Ordre recommandé

- [ ] Phase 0 : sans Google (résumé du matin, alerte avis, dépenses et profit, reçus PDF)
- [ ] Phase 1 : Google Cloud et compte de service (Analytics, Search Console, Agenda)
- [ ] Phase 2 : Gmail par transfert automatique
- [ ] Phase 3 : Google Business Profile (après l'approbation de Google)
- [ ] Phase 4 : Facebook et Instagram

## Phase 0 : sans Google (possible tout de suite)

**Vous obtenez :** un courriel chaque matin à 7 h (heure de l'Est) avec ce qui attend, une carte "Aujourd'hui" à l'accueil, le suivi de vos dépenses et de votre profit, et des reçus PDF.

**Vos tâches :**
- [ ] 1. (10 min) Ouvrir admin.html, aller dans "Mon plan" et vérifier que la phase 0 apparaît.
- [ ] 2. (20 min) Lister vos dépenses de l'année dans un fichier simple : date, montant, fournisseur, catégorie.
- [ ] 3. (15 min) Choisir 6 à 8 catégories de dépenses (produits, essence, assurance, téléphone, logiciels, publicité) et les noter.
- [ ] 4. (20 min) Saisir les 5 dernières dépenses dans le nouvel onglet Dépenses.
- [ ] 5. (15 min) Noter le nom légal, l'adresse et les numéros de TPS et TVQ pour les reçus, dans une note privée.
- [ ] 6. (10 min) Ouvrir un reçu de test et vérifier qu'il s'affiche bien.

**Ce que l'équipe construit :**
- [ ] Résumé du matin (fonction `automations`, 7 h Eastern, envoyé par Resend) et carte à l'accueil
- [ ] Table `reviews` prête pour l'alerte avis (vide pour l'instant)
- [ ] Table `expenses` (accès admin seulement) et onglet Profit par mois
- [ ] Reçus et factures PDF numérotés, générés dans le navigateur

**Notes techniques :**
- Morning summary: one send per day, guarded by a sent-log row. Use `America/Toronto` for DST.
- Money as integer cents. Invoice numbers come from a sequence table (no gaps). PDFs client-side (pdf-lib).

**Risques :** résumé envoyé deux fois (le cron peut relancer). Erreurs de taxes sur les reçus : faites valider le modèle par votre comptable.

## Phase 1 : Google Cloud et compte de service

**Vous obtenez :** les chiffres du site (Analytics, Search Console) et votre agenda lus par Bulle, sans mot de passe et sans connexion qui expire. Le compte de service est une adresse "robot" de Google que vous ajoutez comme lecteur.

**Vos tâches :**
- [ ] 1. (15 min) Ouvrir console.cloud.google.com avec votre compte Google et accepter les conditions.
- [ ] 2. (10 min) Créer un projet nommé magicstick-clean (sélecteur de projet, puis Nouveau projet).
- [ ] 3. (15 min) Activer 3 API dans Bibliothèque : Google Analytics Data API, Google Search Console API, Google Calendar API.
- [ ] 4. (15 min) Identifiants, puis Créer des identifiants, puis Compte de service. Nom : bulle-reader. Ne donner aucun rôle. Noter son adresse (elle finit par iam.gserviceaccount.com).
- [ ] 5. (10 min) Dans ce compte, onglet Clés, Ajouter une clé, JSON. Le fichier se télécharge. Ne le mettez ni dans le dossier du site ni dans Git.
- [ ] 6. (15 min) Dans Supabase, Project Settings, Edge Functions, Secrets : ajouter GOOGLE_SERVICE_ACCOUNT_JSON avec le contenu du fichier. Supprimer ensuite le fichier téléchargé.
- [ ] 7. (10 min) Google Analytics, Administration, Gestion des accès : ajouter l'adresse avec le rôle Lecteur.
- [ ] 8. (10 min) Search Console, Paramètres, Utilisateurs : ajouter l'adresse en Restreint.
- [ ] 9. (10 min) Google Agenda, paramètres de l'agenda Magicstick, Partager avec des personnes précises : ajouter l'adresse en "Voir les détails".

**Ce que l'équipe construit :**
- [ ] Fonction `google-reader` qui obtient un jeton d'accès à partir du secret
- [ ] Tableau Analytics (7 et 28 jours) et Search Console (requêtes, clics, impressions)
- [ ] Agenda : rendez-vous de la semaine à l'accueil, avec heure et titre masqué ("Rendez-vous")
- [ ] Cache de 6 heures pour rester sous les quotas

**Notes techniques :**
- Sign a JWT (RS256, WebCrypto in Deno) with the key, exchange at oauth2.googleapis.com/token, cache ~55 min.
- GA4 needs the numeric property ID (analyticsdata.googleapis.com/v1beta/properties/{id}:runReport). Search Console needs the siteUrl exactly as registered. A 403 usually means the role was not granted yet.

**Risques :** la clé JSON est un secret. Si elle fuit, la supprimer dans Google Cloud et en créer une nouvelle. Le titre d'un événement peut contenir un nom de client : ne jamais l'envoyer à l'IA.

## Phase 2 : Gmail par transfert

**Vous obtenez :** chaque courriel de client apparaît aussi dans le tableau de bord. Bulle prépare un brouillon de réponse, et vous l'envoyez d'un clic.

Pourquoi pas l'API Gmail directement : elle exige un audit de sécurité payant, et en mode "Test" les accès expirent chaque 7 jours. Le transfert évite les deux problèmes.

**Vos tâches :**
- [ ] 1. (15 min) Créer votre compte du fournisseur de réception (Resend Inbound ou Cloudflare Email Routing, selon le choix de l'équipe).
- [ ] 2. (20 min) Chez votre fournisseur de domaine, ajouter l'enregistrement MX donné par l'équipe. Copier-coller seulement.
- [ ] 3. (15 min) Gmail, engrenage, Voir tous les paramètres, Transfert et POP/IMAP : ajouter l'adresse de réception. Gmail envoie un code : copiez-le depuis la boîte de réception du tableau.
- [ ] 4. (20 min) Gmail, Filtres : créer un filtre limité (mots "soumission", "nettoyage", "facture") qui transfère vers l'adresse. Ne transférez jamais toute votre boîte.
- [ ] 5. (10 min) Envoyer un courriel test depuis un autre compte et vérifier qu'il arrive dans le tableau.

**Ce que l'équipe construit :**
- [ ] Fonction `inbound-email` qui vérifie la signature du fournisseur, puis enregistre dans `inbox_messages`
- [ ] Table `inbox_messages` (admin seulement) avec le statut et le brouillon de Bulle
- [ ] Bouton Confirmer et envoyer (Resend, depuis magicstickclean.ca) ou Ouvrir dans Gmail

**Notes techniques :**
- Reject webhooks without a valid signature. Dedupe on the provider's message_id (retries happen).
- Strip HTML, attachments, phone numbers and emails before text reaches the AI. Never send the sender's address.

**Risques :** filtre trop large (courriels personnels transférés). Données clients : accès admin seulement, durée de conservation à décider avec vous.

## Phase 3 : Google Business Profile (après approbation)

**Vous obtenez :** une alerte quand un nouvel avis Google arrive, et un brouillon de réponse que vous confirmez. Jamais d'offre en échange d'un avis.

**Vos tâches :**
- [ ] 1. (10 min) Vérifier que votre fiche Google Business Profile est vérifiée (statut dans le tableau de bord de la fiche).
- [ ] 2. (20 min) Remplir le formulaire de demande d'accès API de Google (lien dans la documentation Business Profile API). Envoyer, puis mettre une relance dans 2 semaines dans Mon plan.
- [ ] 3. (20 min) Une fois approuvé, dans le projet magicstick-clean, créer un identifiant OAuth de type Application Web avec l'URL de retour donnée par l'équipe.
- [ ] 4. (5 min) Copier l'ID client et le secret dans Supabase : GBP_CLIENT_ID et GBP_CLIENT_SECRET.
- [ ] 5. (15 min) Écran de consentement OAuth : type Externe, avec votre courriel comme utilisateur de test seulement.
- [ ] 6. (10 min) Dans Réglages du tableau, cliquer Connecter Google Business, puis vous connecter vous-même.
- [ ] 7. (20 min) Publier l'application (écran de consentement, Publier) pour éviter l'expiration des jetons chaque 7 jours. Lancer la vérification de Google (sans audit payant).

**Ce que l'équipe construit :**
- [ ] Connexion OAuth ; le jeton de rafraîchissement reste dans une table chiffrée, admin seulement
- [ ] Synchronisation des avis toutes les 15 min (`automations`), alerte courriel et carte
- [ ] Bulle propose une réponse courte, chaleureuse, sans rabais ni promesse
- [ ] Bouton Confirmer la réponse, puis publication

**Notes techniques :**
- Scope: https://www.googleapis.com/auth/business.manage. Use the Business Profile reviews endpoints (list and reply).
- Unique external_review_id: only new reviews alert. Log who confirmed each reply. In "Testing" status, refresh tokens expire after 7 days.

**Risques :** délai d'approbation imprévisible. Aucun avis faux, aucune demande d'avis cinq étoiles.

## Phase 4 : Facebook et Instagram

**Vous obtenez :** Bulle lit les commentaires et messages de votre page et prépare des réponses. Vous confirmez chacune. Rien n'est publié seul.

**Vos tâches :**
- [ ] 1. (20 min) Vérifier que votre compte Instagram est professionnel et lié à votre Page Facebook (Paramètres Instagram, Centre des comptes).
- [ ] 2. (20 min) Sur developers.facebook.com, créer une application nommée Magicstick Bulle. Elle reste en mode Développement.
- [ ] 3. (15 min) Dans l'application, ajouter les permissions que l'équipe confirme : pages_show_list, pages_read_engagement, pages_messaging, instagram_basic.
- [ ] 4. (20 min) Suivre le guide de l'équipe pour obtenir le jeton de Page longue durée. Le copier dans Supabase (META_PAGE_TOKEN). Ne jamais le coller dans le chat ni dans le code.
- [ ] 5. (10 min) Ajouter votre compte comme administrateur de l'application (Rôles).
- [ ] 6. (5 min) Cocher ici : Bulle reste en mode brouillon seulement (recommandé).

**Ce que l'équipe construit :**
- [ ] Lecture des commentaires et messages de la Page (abonnement aux webhooks)
- [ ] Brouillons de réponses, validés par vous avant envoi
- [ ] Alerte si le jeton ne fonctionne plus

**Notes techniques :**
- Verify X-Hub-Signature-256 with the app secret (Supabase only). Instagram is reached via the Page's instagram_business_account field.
- Dev mode works only for the owner's Page and app admins. Other users would need App Review.

**Risques :** les règles de Meta changent. Un jeton peut être révoqué : prévoir l'alerte.

## Coûts

Aucun prix n'est vérifié ici. Consultez les pages tarifaires avant de payer.
- Gmail, Google Analytics, Search Console, Agenda, Business Profile et Meta Développeur : gratuits pour votre volume. Google peut demander une carte à la création du projet : ne payez rien sans l'avoir vérifié avec l'équipe.
- Cloudflare Email Routing (si choisi) et Resend : offres gratuites, limites à vérifier. Supabase : votre plan actuel.
- Évité : l'audit de sécurité Gmail (CASA), qui est payant.

## Ce qu'on ne fera jamais

- Vous ne donnez jamais votre mot de passe à Claude ni à Bulle. Vous créez chaque compte vous-même.
- Aucun secret (clé, jeton, mot de passe) dans le dépôt Git ni dans le navigateur. Seulement dans les secrets Supabase ou une table chiffrée réservée à l'admin.
- Aucun envoi à un client sans votre clic (loi CASL).
- Aucun faux avis, aucune offre en échange d'un avis Google ou Facebook.
- Aucun numéro de téléphone, courriel ou adresse de client envoyé au modèle IA.

## Pour reprendre ce plan

Dites à une future session Claude : "Lis PLAN-CONNEXIONS.md et CLAUDE.md. Commence à la première phase non cochée. Ajoute les tâches du propriétaire comme lignes dans plan_tasks."

Exemple de ligne à ajouter. Dans `plan_tasks`, `phase` est la semaine du plan marketing : utilisez 12 et plus pour ces connexions, une étape par ligne dans `steps_*`, et une date `due_on` après les examens (le propriétaire choisit).

```sql
insert into plan_tasks (id, phase, sort, due_on, minutes, title_fr, steps_fr, title_en, steps_en)
values ('connect-p1-01', 12, 1, '2027-01-04', 10,
  'Créer le projet Google Cloud',
  E'Ouvrez console.cloud.google.com avec votre compte Google\nSélecteur de projet → Nouveau projet\nNom : magicstick-clean → Créer',
  'Create the Google Cloud project',
  E'Open console.cloud.google.com with your Google account\nProject picker → New project\nName: magicstick-clean → Create')
on conflict (id) do nothing;
```
