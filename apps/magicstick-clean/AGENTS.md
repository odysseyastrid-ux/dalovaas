# AGENTS.md: maintenance directives for Magicstick Clean

You are maintaining **magicstickclean.ca**, the real website of a small, owner-operated
cleaning business. Mistakes cost the owner real customers. Work carefully and verify
everything you do.

**Read `CLAUDE.md` first.** It covers the business, prices, the funnel and the hard rules.
This file covers *how* to change, test and deploy the site safely.

- **Language:** the owner is not technical and speaks French. Write to them in simple
  French, with no jargon, and say plainly what you did and what is left.
- **Working folder:** everything is in `apps/magicstick-clean/`. The repository root (`apps/web/`,
  "Chez Sanji") is a **different project**. Do not touch it.

---

## 1. Hard rules (never break them, even if asked casually)

1. **Never invent anything.** That means reviews, ratings, review counts, testimonials,
   certifications, insurance, awards, "years of experience", client counts, before/after
   photos, local addresses or city pages.
   - Real Google reviews are in `js/reviews.js`, copied word for word. `summary` = the
     rating and count shown on Google.
   - Add a review only from a screenshot or text of the real Google review. Check it is
     not already there. The Luffy M. review (5★, "Louis was very diligent…") already is.
2. **No price is ever shown on the site** (owner's decision, Nov 4, 2026): not in pages,
   JSON-LD, meta descriptions or Louis's answers. Every price comes from a personalized quote
   the owner sends (dashboard → "Send the price"). Never change business details (service
   area, phone, email, name) without the owner's explicit OK.
3. **Never pretend something works.** A form shows "received" only if the server really
   saved it. A test counts as passed only if you actually ran it and saw it pass.
4. **No online payment** while `ONLINE_PAYMENTS: false` in `js/config.js` (see §7).
5. **Never commit secrets.** The only keys allowed in the repo are the Stripe *publishable*
   key (`pk_…`) and the Supabase *publishable* key (`sb_publishable_…`), both in
   `js/config.js`. Everything else is a Supabase secret, set in the dashboard.
6. **Never offer anything in exchange for a review** (Google policy).
   - Ask for a review only after a real completed job, with at most one reminder.
   - Never write or suggest fake reviews.
7. **The contest ("50 ménages gratuits") is closed.** Never promote it again.
   - `concours.html` stays only as a "closed" notice plus the rules: noindex, not in the
     menus or sitemap, still reachable because printed flyers point to it.
   - The 3 entries received stay valid and the draw (Jan 5, 2027) must still be honoured.
     The owner runs it from the dashboard.
   - Marketing offers may only go to entrants who ticked the consent box
     (`marketing_consent_at` not null), because of the CASL law.
8. **Don't promise "the same cleaner every visit"** (the owner plans to hire). There is no
   first-booking discount. The services list "Not yet available" in CLAUDE.md must not
   be promised.
9. **Kept on purpose, do not revert:**
   - logins live in `sessionStorage` (sign-out when the browser closes);
   - Vercel preview URLs are **not** allowed by the functions' CORS;
   - the hero slogans chosen by the owner:
     - EN: "We're the best, we're affordable and we're Canada 🍁 made."
     - FR: "On est les meilleurs, on n'est pas chers et on est canadiens 🍁."
10. **Personal data:** never copy client names, phones or emails out of the database into files,
    commits or chats with third parties. Never store the owner's ID documents.
11. Do not put model names or AI identifiers in commits, code or docs.

---

## 2. Map of the project

```
apps/magicstick-clean/
├── *.html              27 static pages (no build step; each page has its own <head>)
│   ├── index.html      home: hero, estimator, services, reviews, contact band
│   ├── quote.html      free quote form  ← main conversion
│   ├── pay.html        client pays a quote with its code (quote-pay function)
│   ├── gift-cards.html gift-card request (paid by e-transfer)
│   ├── account.html    client login / own bookings
│   ├── admin.html      owner dashboard (login + admin_users)
│   ├── services.html, service-*.html, locations.html, location-*.html (SEO pages)
│   ├── about, learn-more, careers, terms, privacy, 404
│   └── concours.html   contest CLOSED notice + rules (noindex)
├── css/styles.css      one stylesheet for every page (motion "fluid layer" at the end)
├── js/
│   ├── config.js       public config: Supabase URL + publishable key, Stripe pk, ONLINE_PAYMENTS
│   ├── i18n.js         ALL UI strings EN/FR (STRINGS)  · i18n-content.js = long texts (c.*)
│   ├── quote.js, booking.js, gift-cards.js, careers.js, account.js, admin.js, admin-dashboard.js
│   ├── form-guard.js   anti-spam (honeypot "website" + "I'm not a robot" box: real click + 2.5 s minimum)
│   ├── reviews.js      real Google reviews (word for word)
│   ├── estimator.js    instant price estimator
│   ├── ai-chat.js      "Louis" chat widget (talks to the ai-chat function)
│   └── script.js, site-enhancements.js, supabaseClient.js …
├── assets/             real photos/videos of the business (only real ones!)
├── supabase/
│   ├── migrations/     0001 … 0023 (SQL, applied in order). Next one = 0024
│   └── functions/      Deno edge functions + tests/ (see §5)
├── tools/              maintenance scripts (see §4), not deployed
├── server/             optional separate Express admin API, NOT deployed, ignore it
├── vercel.json         headers (CSP!), redirects, clean URLs
├── .vercelignore       keeps /supabase /server /tools /*.md … off the public site
├── sitemap.xml, robots.txt
└── *.md                docs (not served publicly, thanks to .vercelignore)
```

**Accounts and IDs:**
- **Vercel:** project `magicstickclean` (`prj_deNjozw3hzntPNhme8Zo3UQQQXkQ`), team
  `odysseyastrid-2841s-projects` (`team_T20Fh4S61LTdTsmmak24uiQj`).
- **Supabase:** project `siqpcnhfpseorjuwfrop`.
- **GitHub:** repo `odysseyastrid-ux/dalovaas`. The working branch so far is `claude/creer-app-07efr9`.
- **Email:** Resend, sending from `noreply@magicstickclean.ca`.
- **AI:** Groq.
- **Owner inbox:** `magicstickclean@gmail.com`.

---

## 3. Translations (FR/EN): rules

- Every visible text has a key in `js/i18n.js`, **one line per key**:
  `'key': { en: '...', fr: '...' },`. Pages use `data-i18n="key"`,
  `data-i18n-html="key"` (HTML allowed) or `data-i18n-placeholder="key"`.
- The text written inside the HTML tag is the fallback. It **must equal the EN string**
  (search engines and no-JS visitors see it). After editing strings, run
  `node tools/sync-html-fallbacks.mjs --write`.
- **French addresses customers with "vous"** (careers and admin may use "tu"). Use
  Canadian French ("courriel", "magasiner", "fin de semaine"), and a space before ? ! : in French.
- Prices are always shown with **CAD** on headline prices.
- Every page has its own `<title>` and meta description. Titles are also i18n keys `title.*`.
  Keep exactly one `<h1>` per page.
- Long texts (service pages, deep content) are in `js/i18n-content.js` as `c.*` keys.

## 4. Tools (run from `apps/magicstick-clean/`)

| Command | What it does |
|---|---|
| `python3 tools/i18n-set.py edits.json` | Adds or updates keys in `js/i18n.js` safely. Format: `[{"key":"x","en":"…","fr":"…","after":"existing.key"}]` (`after` only needed for new keys) |
| `node tools/sync-html-fallbacks.mjs` | Shows the HTML fallbacks that differ from EN. Add `--write` to fix them |
| `node tools/i18n-check.mjs` | Keys used but missing, missing FR, customer French in "tu". **All three must say "none"** |
| `node tools/audit-crawl.mjs` | Playwright crawl of the live site: JS errors, failed requests, broken links, horizontal overflow (desktop + mobile). Expect 0 everywhere |

If Playwright isn't installed in the folder, point to it: `PLAYWRIGHT=/path/to/playwright/index.js`. Optional: `CHROMIUM=/path/to/chrome`, `CHROMIUM_ARGS="--flag …"` (e.g. a proxy certificate). A clean run prints `No problems found.`

## 5. Edge functions (Supabase, Deno)

| Function | Role | Status |
|---|---|---|
| `quote-pay` | pay.html: shows a quote's price by `pay_code`; creates the Stripe PaymentIntent (only if secret `QUOTE_CARD_PAYMENTS=on`) | LIVE once deployed |
| `submit-quote` | Quote form (+ old booking requests): saves to `quote_requests`, uploads, **emails the owner (FR) and the client** | LIVE, critical |
| `submit-form` | newsletter, gift-card requests, job applications, contest (refuses after the closing date with 410) | LIVE |
| `ai-chat` | "Louis" public chat (Groq). Must never invent prices or policies | LIVE |
| `owner-assistant` | private co-pilot in the dashboard (admins only) | LIVE |
| `send-auth-email` | Supabase Auth email hook (signup/reset emails via Resend) | LIVE |
| `create-payment-intent`, `stripe-webhook`, `gift-cards` | Stripe payments | idle (payments off) |
| `sync-to-twenty` | optional CRM sync | optional |
| `notify-quote-request` | old webhook notifier | **unused**, replaced by submit-quote |
| `create-checkout-session` | retired stub (410) | dashboard only, not in repo |
| `stripe-diag` | diagnostic (JWT) | dashboard only, not in repo: candidate for deletion (ask the owner) |

**Rules for functions:**
- **`guard.ts` exists in 6 copies** (ai-chat, create-payment-intent, gift-cards, submit-form,
  submit-quote, quote-pay) that must stay **byte-identical**. Check with
  `md5sum supabase/functions/*/guard.ts`; the md5 today is `8868ff5b4bada5231ec79aa533e05535`.
  Change one, change all.
- CORS allows only `https://magicstickclean.ca` and `https://www.magicstickclean.ca`. Any other
  origin gets 403 before any work (`rejectForeignOrigin`). Do not add preview domains.
- Never log a provider's response body (Resend/Groq). Log the status and error name only.
- **Deploying a function** uploads *all* its files: `index.ts`, `guard.ts`, and for
  submit-quote also `validate.ts` and `notify.ts`. Use `verify_jwt = false` for the public
  ones; `owner-assistant` checks the user itself.
  - With the Supabase MCP: `deploy_edge_function` with every file's full content.
  - With the CLI: `supabase functions deploy <name> --project-ref siqpcnhfpseorjuwfrop --no-verify-jwt`.
- **Secrets (names only, values are in the Supabase dashboard → Edge Functions → Secrets):**
  `RESEND_API_KEY`, `OWNER_EMAIL`, `OWNER_NOTIFY_FROM`, `GROQ_API_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `WEBHOOK_SHARED_SECRET`, `SEND_EMAIL_HOOK_SECRET`, `TWENTY_API_URL`,
  `TWENTY_API_KEY`. Never print, copy or ask for their values.

**Tests:** `cd supabase/functions/tests && deno test -A`. Today **103 pass, 0 fail**. They
must all pass before any function deploy.
- `csp.test.ts` guards the CSP hashes (see §6).
- The contest tests pin the date, so they don't break with time.

**Database:**
- Migrations are numbered. Add `supabase/migrations/0024_<name>.sql`, then apply it with the
  MCP `apply_migration` or the SQL editor.
- Never edit an old migration.
- RLS is on everywhere. Public writes go only through the functions.
- Main tables: `services`, `service_addons`, `quote_requests` (quotes **and** booking requests,
  column `source`), `bookings`, `gift_card_requests`, `job_applications`,
  `newsletter_subscribers`, `contest_entries`, `ai_knowledge` (`client` / `owner` rows,
  editable in the dashboard), `admin_users`.
- **Admins:** `magicstickclean@gmail.com`, `odysseyastrid@gmail.com`.
- **Nightly job:** `purge-quote-orphans` (cron `17 3 * * *`), which cleans upload files
  that have no quote. It uses the Vault secret `purge_secret`.

## 6. Security headers / CSP (vercel.json)

- Scripts: no `'unsafe-inline'`, no `onclick=` attributes. Put JS in `js/*.js`.
- The two inline scripts are allowed **by hash**:
  - the theme snippet in every page's `<head>`: `sha256-6r4mx4zQ0eqh5UworK2jZaknb8EbiMIYPcHQVOyQftA=`;
  - the splash gate in `index.html`: `sha256-APAo2W2QYcNR0yXJspZVu/EY5XpgW+Is/r83jE1qKFI=`.

  Changing even one character of these scripts changes the hash. `csp.test.ts` fails and
  prints the new value, which you then update in `vercel.json`.
- A new external script, font or API domain must be added to the CSP, or it is silently
  blocked in production. Check the browser console on the live site after deploying.

## 7. Payments switch (`ONLINE_PAYMENTS` in js/config.js)

- `false` (now): `pay.html` offers **Interac e-Transfer** (or pay on the day) and never loads
  Stripe.js; the owner marks the quote paid in the dashboard. Gift cards are by e-transfer.
- To turn payments on (**only when the owner asks and Stripe is activated**):
  1. Check that the Stripe account is activated and the live secret and webhook secret are set.
  2. Set `ONLINE_PAYMENTS: true` **and** the Supabase secret `QUOTE_CARD_PAYMENTS=on`; check that
     the Stripe webhook listens to `payment_intent.succeeded` (quotes use `metadata.kind = "quote"`).
  3. Make one real small payment end to end: quote marked paid (`quote_requests.paid_at`), webhook received,
     emails sent. Then refund it.
  4. Update CLAUDE.md, the terms and the AI knowledge (deposit wording).

  If any step fails, set it back to `false`.

## 8. Deploying the website (Vercel)

- **Pushing to GitHub creates only a *preview*** (needs a Vercel login). The real site
  changes only after a **production** deploy:
  - Vercel dashboard → project magicstickclean → Deployments → the preview → **Promote to
    Production**; or
  - Vercel MCP `create_deployment` with `target: "production"` and the gitSource
    (org `odysseyastrid-ux`, repo `dalovaas`, the branch, the commit sha).
- Previews **cannot** call the Supabase functions (CORS). To test forms before production,
  open the pages locally and route `https://magicstickclean.ca/**` to the local files
  (Playwright `page.route`), or test on production right after deploy.
- Only `.md`, `/supabase`, `/server`, `/tools`… are excluded by `.vercelignore`. Never put
  private notes in a served file.
- If a deploy breaks the site, **roll back immediately**: Vercel → Deployments → previous
  production → "Promote", or the MCP `request_rollback`.

## 9. Checklist before saying "done"

1. `node tools/i18n-check.mjs` gives three "none". `node tools/sync-html-fallbacks.mjs` gives 0 differences.
2. If functions changed: `deno test -A` is all green, the guard.ts md5 values are identical,
   the function is deployed, and the logs show no error (`query_logs` / dashboard).
3. If a form changed: send **one real test** on production.
   - Fill **only** the visible fields and tick the "I'm not a robot" box with a real click
     (`.human-box`, after 2.5 s), **never the hidden honeypot `website` field**, or the
     form pretends success and saves nothing. A real Google reCAPTCHA / Cloudflare Turnstile
     needs keys from the owner's account (site key in config.js, secret in Supabase) and a
     server-side check in submit-quote / quote-pay / submit-form: not done yet.
   - Check that the row exists in the database and the owner email arrived.
   - Name the test "TEST …", then ask the owner before deleting the row.
4. Check the page in **FR and EN**, desktop **and** mobile (375 px): no horizontal scroll,
   menu not overlapping.
5. Production deploy, then `node tools/audit-crawl.mjs`: 0 JS errors, 0 failed requests,
   0 broken links.
6. Commit with a clear message, update CLAUDE.md if behaviour changed, and tell the owner in
   simple French what changed and what's left.

## 10. Known open items (as of Nov 4, 2026)

- **Deployed Nov 4, 2026:** `quote-pay` v2 (get/intent/book_standard/send_link; card ON unless
  secret `QUOTE_CARD_PAYMENTS=off`) and `ai-chat` v24. **The owner declined deploying the
  `stripe-webhook` change** ("leave Stripe as it is"): the live webhook (v19) ignores
  `metadata.kind = "quote"`, so a card-paid quote is NOT marked paid automatically; the owner
  gets Stripe's own payment email and clicks "Mark as paid". Don't redeploy stripe-webhook
  without the owner's explicit OK.
- **Terms:** the late-cancellation rule for prepaid quotes was removed with the deposit text;
  ask the owner whether he wants one (don't invent it).
- **Interac:** confirm with the owner that magicstickclean@gmail.com receives e-Transfers
  (autodeposit) before relying on it.
- `submit-quote`'s client email still says "nothing to pay online" (true until the payment
  link is sent); update notify.ts + quote_v2.test.ts and redeploy if the owner wants.

- **3 TEST rows** in `quote_requests` from the final tests are waiting for the owner's OK to delete:
  `bd20a99b-f727-46de-a62a-efd20a480e66`, `4dd04bbc-c7f5-46d9-b408-75c3a32c8e7b`,
  `93e2e4d0-60b1-41da-b589-d1f90f74cb17`.
- **7 real quotes never answered** (Sept 22 ×4, Sept 27, Sept 30, Oct 26). The owner must answer them.
- **Contest draw** on Jan 5, 2027 for the 3 entrants (dashboard → Contest → "Draw the winners").
- **Stripe** is not activated, so payments stay off.
- **Terms (`terms.html`):** 3 delays still to be decided by the owner: how long a client has
  to report a problem, the satisfaction-guarantee window, and the non-solicitation period.
  Don't invent them.
- **Supabase security advisor:** "leaked password protection" is disabled
  (Auth → Settings; needs a paid plan or the owner's decision).
- **Insurance:** the site claims none. Add it only if the owner gives proof.
- **Domain:** the registrar is unknown to us. The owner should check the renewal date.
- Some SEO pages are English-only (known gap). French versions need real, non-duplicate content.
- `stripe-diag` and `create-checkout-session` (dashboard-only functions) can be deleted, with the owner's OK.
