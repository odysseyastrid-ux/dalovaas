# Logique des automatisations du backend — Magicstick Clean

Document de référence pour reproduire le même système sur un autre backend (par ex. Yaovi).
Code d'origine : `supabase/functions/automations/index.ts`, migrations `0030` et `0030b`.

---

## 1. L'idée en une phrase

Une seule fonction serveur (`automations`) regarde la base de données, trouve les commandes
pour lesquelles un courriel est **dû**, l'envoie, puis le **tamponne** (date d'envoi) pour ne
jamais l'envoyer deux fois. On peut la lancer autant de fois qu'on veut : elle ne fait que ce
qui reste à faire.

```
                ┌───────────────── toutes les 15 min (pg_cron)
                │
 tableau de bord ─┼── après chaque action (« Marquer payé », « Fait », assigner…)
                │
 webhook Stripe ──┘── après un paiement par carte
                         │
                         ▼
               fonction "automations"
        1. lit les commandes dues (5 requêtes)
        2. pour chacune : réserve le tampon → envoie → (annule le tampon si échec)
        3. répond { receipts, job_sheets, reminders, thanks, unpaid }
```

Pourquoi ce modèle plutôt qu'un courriel envoyé directement par chaque bouton :
- **Un seul endroit** contient tous les courriels → facile à modifier.
- **Rien ne se perd** : si l'envoi échoue ou si personne n'appelle la fonction, la
  prochaine passe des 15 minutes rattrape.
- **Jamais en double** : même si deux passes tournent en même temps.

---

## 2. Les données nécessaires

### Table principale : les commandes (`quote_requests`)

Colonnes « d'état », remplies par le site, le tableau de bord ou Stripe :

| Colonne | Sens |
|---|---|
| `quoted_amount_cents`, `quoted_at` | prix envoyé au client, et quand |
| `pay_code` | numéro de commande (sert au lien de paiement) |
| `paid_at`, `payment_method` | payé, et comment (`card` / `interac`) |
| `scheduled_date`, `scheduled_window` | date confirmée du rendez-vous + plage horaire |
| `completed_at` | travail marqué « fait » |
| `status` | `declined` = annulée (ignorée par tout) |
| `assigned_employee_id` | employé assigné (→ table `employees`) |
| `lang` | `fr` / `en` (langue des courriels) |
| `email` / `contact` | où écrire au client |

Colonnes « tampon », une par courriel automatique (vides = pas encore envoyé) :

| Tampon | Courriel |
|---|---|
| `receipt_sent_at` | reçu de paiement |
| `job_sheet_employee_id` + `job_sheet_sent_at` | fiche de travail (on retient **à qui** elle a été envoyée) |
| `reminder_sent_at` | rappel de la veille |
| `thanks_sent_at` | merci + avis Google |
| `unpaid_reminder_at` | relance prix non payé |

### Table `employees`

`id, name, email, phone, active`. Les employés reçoivent seulement des courriels ; ils n'ont
aucun accès au tableau de bord.

---

## 3. Les 5 règles

Heure de référence : **heure de l'Est (America/Toronto)**, pas l'heure du serveur.
« Journée » = entre 9 h et 20 h (on n'écrit pas aux clients la nuit).

| # | Courriel | Condition pour être « dû » | Quand | Destinataire |
|---|---|---|---|---|
| 1 | **Reçu** | `paid_at` rempli, `receipt_sent_at` vide, payé il y a moins de 14 jours | tout de suite, à toute heure | client |
| 2 | **Fiche de travail** | `assigned_employee_id` rempli, pas encore fait, date vide ou à venir, et `job_sheet_employee_id` ≠ employé assigné | tout de suite | employé |
| 3 | **Rappel veille** | `scheduled_date` = demain, `reminder_sent_at` vide, pas encore fait | à partir de 9 h | client + employé |
| 4 | **Merci + avis** | `completed_at` il y a entre 2 h et 7 jours, `thanks_sent_at` vide | 9 h – 20 h | client |
| 5 | **Relance impayé** | `quoted_at` il y a entre 3 et 30 jours, pas payé, `unpaid_reminder_at` vide | 9 h – 20 h | client |

Règles communes :
- Les commandes `status = 'declined'` sont toujours ignorées.
- Maximum 50 commandes par règle et par passe (le reste passe à la passe suivante).
- Pas de courriel valide → on pose quand même le tampon (sinon on la relirait à chaque passe).
- La relance impayé n'est envoyée **qu'une fois**, jamais plus.
- Le courriel « Merci » pose aussi `review_requested_at` (pour ne pas redemander un avis à la main).
- La fiche de travail est **renvoyée** si on change d'employé (c'est pour ça qu'on stocke
  l'id de l'employé et pas seulement une date).

---

## 4. Le cœur : « réserver, envoyer, sinon libérer »

C'est ce qui garantit **un seul envoi**, même avec deux passes simultanées.

```sql
-- 1. Réserver : ne réussit que si le tampon est encore vide.
update quote_requests
   set receipt_sent_at = now()
 where id = :id
   and receipt_sent_at is null
returning id;
-- 1 ligne retournée → c'est moi qui envoie.  0 ligne → quelqu'un l'a déjà fait, je passe.
```

```
si réservé :
    ok = envoyer_courriel(...)
    si pas ok :
        update quote_requests set receipt_sent_at = null where id = :id   -- libérer
        → la prochaine passe réessaiera
```

Variante pour la fiche de travail (renvoi si l'employé change) :

```sql
update quote_requests
   set job_sheet_employee_id = :employe, job_sheet_sent_at = now()
 where id = :id
   and (job_sheet_employee_id is null or job_sheet_employee_id <> :employe)
returning id;
```

Le rappel de la veille réserve son tampon **avant** les deux envois (client + employé) et
ne le libère pas : on préfère rater un rappel que l'envoyer deux fois.

---

## 5. Ce qui déclenche la fonction

1. **Toutes les 15 minutes** (filet de sécurité) :
   ```sql
   select cron.schedule('magicstick-automations', '*/15 * * * *', $$
     select net.http_post(
       url := 'https://<projet>.supabase.co/functions/v1/automations',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{"source": "cron"}'::jsonb);
   $$);
   ```
2. **Juste après une action du tableau de bord** (`pingAutomations()` dans `js/admin.js`) :
   marquer payé, planifier, marquer fait, assigner un employé → le courriel part en quelques
   secondes au lieu d'attendre 15 min.
3. **Le webhook Stripe** : après un paiement par carte, il pose `paid_at` +
   `payment_method = 'card'`, prévient le propriétaire, puis appelle `automations`.
   Il n'envoie **pas** le reçu lui-même : un seul chemin pour la carte et Interac.

---

## 6. Sécurité

- La fonction est **publique** (pas besoin de connexion) : elle ne prend aucun paramètre et
  ne fait que ce que la base dit d'envoyer. Appeler la fonction 100 fois = même résultat.
- **Limite de débit** : 120 appels/heure par adresse IP, 400/heure au total.
- **CORS** : les navigateurs ne peuvent l'appeler que depuis le vrai domaine du site.
- Clés secrètes (Resend, service role) uniquement dans les secrets du serveur, jamais dans le code.
- Les journaux n'affichent jamais le contenu des réponses de Resend (elles contiennent des adresses).
- Tout texte venant de la base est échappé (`esc()`) avant d'aller dans le HTML du courriel.

---

## 7. Mise en route sans mauvaise surprise

Avant d'activer, on marque **toutes les commandes existantes** comme déjà traitées, pour
qu'aucun ancien client (ou test) ne reçoive un courriel d'un coup :

```sql
update quote_requests set receipt_sent_at   = now() where paid_at is not null       and receipt_sent_at is null;
update quote_requests set thanks_sent_at    = now() where completed_at is not null  and thanks_sent_at is null;
update quote_requests set unpaid_reminder_at = now() where quoted_at is not null and paid_at is null and unpaid_reminder_at is null;
update quote_requests set reminder_sent_at  = now() where scheduled_date is not null and reminder_sent_at is null;
```

Puis on lance la fonction une fois à la main : la réponse doit être
`{"ok":true,"sent":{"receipts":0,"job_sheets":0,"reminders":0,"thanks":0,"unpaid":0}}`.

---

## 8. Les courriels

- Envoyés avec **Resend** (`from` = adresse noreply du domaine, `reply_to` = courriel du
  propriétaire → le client peut répondre directement).
- Un seul gabarit HTML (`layout()`) : bandeau couleur, logo, titre, paragraphes, un bouton
  facultatif, pied avec téléphone et zones. Une version texte est toujours jointe.
- Bilingue selon `lang` ; on tutoie l'employé, on vouvoie le client.

---

## 9. Adapter à Yaovi — liste de contrôle

1. **Choisir la table « commande »** de Yaovi et noter les colonnes équivalentes à :
   payé, date du rendez-vous, terminé, annulé, langue, courriel client.
   S'il n'y a pas d'équivalent, ajouter la colonne.
2. **Lister les courriels voulus** (même tableau qu'en section 3) : pour chacun, écrire
   la condition « dû » et la fenêtre horaire.
3. **Ajouter une colonne tampon par courriel** (`xxx_sent_at timestamptz`), et une table
   `employees` si Yaovi a une équipe.
4. **Marquer l'existant comme traité** (section 7) avant toute activation.
5. **Copier la fonction** et changer seulement : nom de la table, colonnes, `SITE`,
   fuseau `TZ`, lien d'avis, textes des courriels, couleurs du gabarit.
6. **Brancher les déclencheurs** : la tâche des 15 minutes, l'appel après chaque action
   du tableau de bord, et l'appel depuis le webhook de paiement.
7. **Mettre les secrets** dans le serveur de Yaovi (clé Resend, adresse d'envoi, courriel
   du propriétaire) — jamais dans le code.
8. **Tester** : appel à la main → tout à 0 ; puis une fausse commande avec votre propre
   courriel, la faire avancer étape par étape et vérifier que chaque courriel arrive une fois.

Squelette à réutiliser (pseudo-code) :

```ts
const RULES = [
  { stamp: "receipt_sent_at", due: (q) => q.paid_at && !q.receipt_sent_at,  hours: "any",   send: sendReceipt },
  { stamp: "reminder_sent_at", due: (q) => q.date === tomorrow,             hours: "9-24",  send: sendReminder },
  { stamp: "thanks_sent_at",   due: (q) => doneMoreThan(q, 2, "h"),          hours: "9-20",  send: sendThanks },
  // ...
];

for (const rule of RULES) {
  if (!inHours(rule.hours, nowEastern)) continue;
  for (const q of await findDue(rule, { limit: 50 })) {
    if (!(await claim(q.id, rule.stamp))) continue;        // déjà pris
    const ok = await rule.send(q);
    if (!ok) await release(q.id, rule.stamp);               // réessai à la passe suivante
  }
}
```
