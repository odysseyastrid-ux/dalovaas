# Guide du propriétaire : site Magicstick Clean

*Mis à jour le 3 novembre 2026. Ce guide est pour vous, en mots simples. Le guide technique
pour un agent IA est `AGENTS.md`, dans le même dossier.*

---

## 1. Ce que fait votre site, en bref

Votre site est **magicstickclean.ca**, en français et en anglais.

| Ce que le client fait | Ce qui se passe ensuite |
|---|---|
| Il demande un **devis gratuit** (page « Devis ») | Vous recevez un **courriel en français** avec tous ses détails. Le client reçoit une confirmation s'il a laissé son courriel. La demande est aussi dans votre tableau de bord. |
| Vous lui envoyez **son prix** (tableau de bord → bouton **« Envoyer le prix »**) | Le site crée un **lien de paiement** et un message prêt à envoyer par texto ou courriel. |
| Il ouvre le lien (page **« Payer un devis »**) | Il voit son prix et paie par **virement Interac** (avec son code), ou le jour du ménage. Le paiement par carte viendra quand Stripe sera activé. |
| Il demande une **carte-cadeau** | Vous recevez la demande. Le paiement se fait par virement Interac. |
| Il parle à **Louis** (la bulle de clavardage) | L'IA répond avec vos vrais prix. Elle n'invente rien, sinon elle donne votre téléphone. |
| Il s'abonne à l'infolettre ou postule pour un emploi | C'est enregistré, vous êtes avisé. |

**Vos coordonnées sur le site :** (343) 843-7761 · magicstickclean@gmail.com.

---

## 2. Votre routine (5 minutes par jour)

1. **Lisez vos courriels** « Demande de devis » ou « Demande de réservation ». Ils
   arrivent dans **magicstickclean@gmail.com**, vérifiez aussi les **pourriels** la
   première semaine. Pour répondre au client, faites simplement **« Répondre »**.
2. **Répondez le jour même.** Votre site le promet, c'est votre force.
3. Ouvrez **magicstickclean.ca/admin.html** (connexion avec votre courriel). Sur la demande,
   cliquez **« Envoyer le prix »**. Le **calculateur** en haut propose un prix (taux de vos
   services, minimum 39,50 $/h, heures estimées selon la superficie : ajustez-les). Cliquez
   **« Utiliser ce prix »** et le message est prêt. Ou bien tapez le prix vous-même, cliquez
   **« Enregistrer »**, puis **Texto** ou **Courriel** : le message avec le lien part tout seul.
   Le bouton **« Envoyer au client par courriel »** envoie le prix et le lien tout seul.
   Quand l'argent arrive (virement Interac **ou** courriel de paiement de Stripe), rouvrez la
   demande et cliquez **« Marquer payé »**.
   Les réservations de **ménage standard** faites sur la page « Réserver en ligne » arrivent
   aussi dans la liste, déjà avec leur prix : confirmez la date avec le client.
   Changez aussi le statut : *contacté*, *réservé*, *terminé*…
4. Quand un ménage est **terminé**, mettez le statut « Terminé ». Le site propose alors
   d'**envoyer une demande d'avis Google** (texto, WhatsApp ou courriel, déjà rédigé).
   Un seul rappel au maximum, et **jamais de cadeau en échange d'un avis** (c'est interdit par Google).

**Astuce :** dans le tableau de bord, le **co-pilote privé** (le chat de l'admin) connaît vos
demandes et vos prix. Demandez-lui par exemple « À qui dois-je demander un avis ? » ou
« Rédige une réponse à ce devis ».

---

## 3. Vos comptes (gardez les mots de passe en lieu sûr)

| Service | Sert à | Où |
|---|---|---|
| **Gmail** magicstickclean@gmail.com | recevoir les demandes, connexion admin | gmail.com |
| **Tableau de bord** | voir et gérer les demandes, le concours, les avis, l'IA | magicstickclean.ca/admin.html |
| **Vercel** | héberge le site (le met en ligne) | vercel.com, projet « magicstickclean » |
| **Supabase** | base de données, envoi des courriels, IA | supabase.com, projet `siqpcnhfpseorjuwfrop` |
| **GitHub** | le « code » du site (l'historique de chaque changement) | github.com/odysseyastrid-ux/dalovaas |
| **Resend** | envoie les courriels automatiques (noreply@magicstickclean.ca) | resend.com |
| **Groq** | fait fonctionner l'IA Louis et le co-pilote | console.groq.com |
| **Stripe** | paiements en ligne : **pas encore activé** | stripe.com |
| **Google (fiche d'entreprise)** | vos avis et votre présence sur Google Maps | business.google.com |
| **Nom de domaine** magicstickclean.ca | l'adresse du site | chez votre registraire : **vérifiez la date de renouvellement** |

**Admins du tableau de bord :** magicstickclean@gmail.com et odysseyastrid@gmail.com.

**Lien pour demander un avis Google :** https://g.page/r/CXlL7jiMiQp2EBI/review

**Les clés secrètes** (Resend, Groq, Stripe…) sont rangées dans Supabase → *Edge Functions →
Secrets*. **Ne les donnez jamais** à personne, ni à une IA, ni dans un message. Si un agent
vous les demande, refusez : il n'en a pas besoin.

---

## 4. Ce qui vous attend (décisions et tâches)

1. **7 vraies demandes de devis jamais répondues** (22 sept. ×4, 27 sept., 30 sept., 26 oct.).
   Elles sont dans le tableau de bord. Rappelez ces gens, même en retard.
2. **3 demandes « TEST »** dans le tableau de bord, créées par mes tests finaux. Vous pouvez
   les supprimer, ou dire à l'agent « supprime les 3 demandes TEST ».
3. **Tirage du concours le 5 janvier 2027.** Le concours est fermé, mais les **3 personnes
   inscrites** gardent leur chance (le règlement ne permet pas de l'annuler).
   - Le 5 janvier : tableau de bord → *Concours* → **« Tirer les gagnants »**.
   - Puis contactez-les et posez-leur la **question d'habileté** (c'est obligatoire au
     Canada pour un concours, et c'est dans le règlement).
   - N'envoyez des offres qu'à ceux qui ont coché « j'accepte de recevoir les offres » (c'est la loi canadienne anti-pourriel).
4. **Stripe (paiement en ligne).** Il est éteint, car votre compte Stripe n'est pas activé.
   - Si vous voulez les paiements un jour : activez votre compte Stripe (pièces d'identité,
     compte bancaire), puis demandez à l'agent de les rallumer et de faire un vrai test.
   - En attendant, tout se paie sur place ou par virement.
5. **Conditions d'utilisation : 3 délais à choisir.**
   - Combien de temps un client a pour signaler un problème (ex. 24 h ou 48 h).
   - La durée de votre garantie satisfaction.
   - La période de non-sollicitation (le client ne doit pas embaucher votre employé directement, ex. 12 mois).

   Dites vos chiffres à l'agent, il les mettra.
6. **Assurance responsabilité.** Le site n'en parle pas. Si vous en avez une, envoyez la preuve
   à l'agent pour l'ajouter. Sinon, n'en parlez pas.
7. **Sécurité (option).** Supabase propose de bloquer les mots de passe déjà piratés
   (« leaked password protection »). Ce réglage est dans Supabase → *Authentication*.
8. **Nom de domaine.** Trouvez chez qui il est enregistré et activez le renouvellement automatique.
9. **Avis Google.** Il n'y a pour l'instant **qu'un avis** sur votre fiche : celui de Luffy M.,
   5 étoiles, qui est déjà sur le site. Quand vous en recevez un nouveau, envoyez une
   **capture d'écran** à l'agent, qui le copiera mot pour mot.

---

## 5. Travailler avec un autre agent IA

### Ce qu'il faut lui dire au début (copiez-collez ce message)

> Tu travailles sur le site de mon entreprise de ménage Magicstick Clean.
> Dépôt GitHub : `odysseyastrid-ux/dalovaas`. Travaille **uniquement** dans le dossier
> `apps/magicstick-clean/` (le reste du dépôt est un autre projet).
> Avant tout, lis `apps/magicstick-clean/CLAUDE.md` puis `apps/magicstick-clean/AGENTS.md`
> et respecte toutes leurs règles.
> Parle-moi en français simple, je ne suis pas technique.
> Ne change jamais mes prix ni mes coordonnées sans me demander.
> N'invente aucun avis, aucune photo, aucune certification.
> Teste vraiment ce que tu fais.
> Le changement n'est en ligne qu'après le déploiement **en production** sur Vercel :
> dis-moi clairement si c'est fait.
> Ma demande : …

### Ce que vous pouvez lui demander sans risque
- Corriger un texte, une faute, une traduction.
- Ajouter un **vrai** avis Google (avec votre capture d'écran).
- Changer un prix **que vous avez décidé** (il doit le changer partout : site, base de données, IA).
- Ajouter une photo **de vos vrais travaux**.
- Vérifier que le site fonctionne (« fais une vérification complète du site en ligne »).
- Répondre aux demandes, préparer des messages, faire du marketing honnête.

### Ce qu'il ne faut JAMAIS lui demander
- Écrire de faux avis, ou des avis « inspirés » de clients.
- Ajouter des certifications, une assurance ou des prix que vous n'avez pas.
- Utiliser des photos de banque d'images comme si c'étaient vos travaux.
- Relancer le concours ou en faire la promotion.
- Donner un rabais en échange d'un avis.
- Lui donner vos mots de passe ou vos clés secrètes.

### Comment savoir si l'agent a vraiment fini
Demandez-lui :
- « Est-ce **en ligne en production** ? »
- « As-tu **testé** le formulaire en vrai et reçu le courriel ? »
- « As-tu vérifié en **français et en anglais**, sur **téléphone** ? »

Pour un formulaire, vous devez recevoir le courriel de test dans votre boîte Gmail.

### Si le site est cassé après un changement
Allez sur Vercel → projet *magicstickclean* → **Deployments**. Choisissez la version d'avant
(celle qui marchait), cliquez sur **« … » → « Promote to Production »**. Le site revient en
1 minute. Ou dites simplement à l'agent : « remets la version précédente du site ».

---

## 6. Le rabais de 20 % et le marketing

- **−20 % sur le premier ménage**, un par foyer. Il est annoncé par un bandeau en haut du site,
  par la fenêtre « Dans quel secteur êtes-vous ? » et par Louis. Il est appliqué tout seul sur
  « Réserver en ligne ». Dans le calculateur, il est pré-rempli à 20 % pour un nouveau client.
- La fenêtre du secteur demande ensuite **le nom et le courriel ou téléphone** du visiteur, pour ne
  pas le perdre s'il n'achète pas. Vous recevez un courriel « Nouveau prospect » et il apparaît
  dans le tableau de bord → **Prospects** (bouton « Exporter en CSV » pour vos envois). La loi
  canadienne anti-pourriel exige son accord : il coche une case, sinon rien n'est enregistré. Si
  quelqu'un répond « désabonner », ne lui écrivez plus.
- Pour **arrêter l'offre** un jour, demandez simplement à l'agent : « enlève le rabais de 20 % ».
- Les pages de devis, réservation et paiement montrent vos vrais arguments (réponse le jour même,
  garantie, produits écologiques, paiement sécurisé, entreprise locale) et votre vrai avis Google.

## 7. Les prix

**Aucun prix n'est affiché sur le site** (votre décision du 4 novembre 2026). Chaque client
reçoit son prix personnalisé par le bouton « Envoyer le prix ». Vous aviez parlé d'un minimum de
**39,50 $/h** pour être rentable : le calculateur du tableau de bord l'applique déjà. Pour changer un taux : tableau de bord → Services → Prix (pour 3 h). Ne demandez jamais
à un agent de remettre des prix sur le site sans le vouloir vraiment.
