# Guide du propriétaire : site Magicstick Clean

*Mis à jour le 3 novembre 2026. Ce guide est pour vous, en mots simples. Le guide technique
pour un agent IA est `AGENTS.md`, dans le même dossier.*

---

## 1. Ce que fait votre site, en bref

Votre site est **magicstickclean.ca**, en français et en anglais.

| Ce que le client fait | Ce qui se passe ensuite |
|---|---|
| Il demande un **devis gratuit** (page « Devis ») | Vous recevez un **courriel en français** avec tous ses détails. Le client reçoit une confirmation s'il a laissé son courriel. La demande est aussi dans votre tableau de bord. |
| Il fait une **demande de réservation** (page « Réserver ») | Même chose : courriel + tableau de bord. **Il ne paie rien en ligne.** Vous confirmez la date et il paie sur place. |
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
3. Ouvrez **magicstickclean.ca/admin.html** (connexion avec votre courriel). Changez le statut de
   la demande : *contacté*, *réservé*, *terminé*…
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

## 6. Vos prix actuels (pour mémoire)

Minimum 3 heures par visite. Prix en dollars canadiens.

| Service | Taux | Départ (3 h) |
|---|---|---|
| Ménage standard, Airbnb, commercial | 30 $/h | 90 $ |
| Grand ménage | 43 $/h | 129 $ |
| Fenêtres et vitres (15 % de rabais permanent) | 25,50 $/h | 76,50 $ |
| Après-construction, emménagement / déménagement | 50 $/h | 150 $ |
| Extérieur et saisonnier (pelouse, neige), 15 % de rabais | 50 $/h | sur devis |

Les plans réguliers (chaque semaine, aux 2 semaines, chaque mois) sont à **27 $/h** (10 % de
rabais). Il n'y a **pas de rabais de première visite**.
