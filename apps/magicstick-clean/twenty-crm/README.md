# Twenty CRM — self-hosted, with auto customer sync

[Twenty](https://twenty.com) is an open-source CRM. This folder self-hosts it
via Docker on your own server so every quote request and booking on the site
automatically shows up there as a Person, with a Note attached summarizing
the request — no manual data entry.

This is entirely optional and separate from the Supabase backend in
`../SETUP.md`: the site works fully without it.

## 1. Deploy Twenty on your own server

This needs a real server (a small VPS is enough — 2GB RAM minimum), not this
repo's CI or a static host: Twenty is a full app with a Postgres database, not
a static site.

1. Install [Docker](https://docs.docker.com/engine/install/) and the Compose
   plugin on the server.
2. Copy this `twenty-crm/` folder to the server (or just `git clone` the repo
   there).
3. `cp .env.example .env` and fill in `SERVER_URL`, `ENCRYPTION_KEY` (generate
   with `openssl rand -base64 32`), and `PG_DATABASE_PASSWORD`.
4. Put a reverse proxy with TLS in front of port `3000` (e.g. Caddy or nginx +
   Let's Encrypt) so `SERVER_URL` is reachable over `https://`. Twenty doesn't
   terminate TLS itself.
5. Start it:
   ```bash
   docker compose up -d
   ```
   First boot takes a minute or two while migrations run. Check
   `docker compose logs -f server` if it doesn't come up.

## 2. Create your workspace

1. Visit your `SERVER_URL` in a browser — you'll land on the sign-up screen.
2. Create your account (email + password) and a workspace, e.g. "Magicstick
   Clean". The first account becomes the workspace admin.
3. Finish the short profile step and skip "Invite your team" for now — you'll
   land in the CRM with the default Companies/People objects ready to use.

## 3. Create an API key for the website

1. **Settings → MCP & APIs → API tab → Create API key.**
2. Name it something like "Magicstick Website Sync".
3. Copy the token shown — **it's only shown once.**

## 4. Wire up the sync

1. Deploy the sync function and set its secrets from `apps/magicstick-clean/`:
   ```bash
   supabase secrets set TWENTY_API_URL=https://crm.yourdomain.com
   supabase secrets set TWENTY_API_KEY=paste_the_token_from_step_3
   supabase functions deploy sync-to-twenty --no-verify-jwt
   ```
2. Wire it to fire on both quote requests and bookings — **Supabase Dashboard
   → Database → Webhooks → Create a new webhook**, twice:
   - Table: `quote_requests`, Events: `INSERT` → Edge Function `sync-to-twenty`
   - Table: `bookings`, Events: `INSERT` → Edge Function `sync-to-twenty`

That's it — every new quote request or booking now creates (or reuses, if the
email/phone already exists) a Person in Twenty, with a Note describing what
they asked for.

## What gets synced

- **Person**: name + email or phone (whichever the customer gave — the site
  only collects one free-text "contact" field).
- **Note**, attached to that Person: the service, zone, preferred date, and
  message for a quote request; or the service, date, amount, and status for a
  booking.

Matching is by exact email or phone number, so the same customer submitting a
second quote request or booking updates the same Person with a new Note
rather than creating a duplicate. Nothing about existing fields (name, phone,
email) is overwritten if they already exist on the record.

## Not included (yet)

No Opportunity/pipeline stage tracking, no Company records (this integration
treats every customer as an individual Person, not a business), and no
two-way sync — changes made inside Twenty never write back to the site or
Supabase. Ask if you want any of those built next.
