# Magicstick Clean — Admin API

A small Express + Sequelize + PostgreSQL server for managing the services
catalog shown on the public site (title, description, price, category,
status), with staff login and an activity log.

**This is independent from `apps/magicstick-clean/supabase/`**, which is a
separate Supabase project handling quote requests, online bookings, and
customer accounts for the public site. Nothing here touches that data —
don't point both at the same database.

## Setup

1. Create a PostgreSQL database and a role that owns it, e.g.:
   ```bash
   sudo -u postgres psql -c "CREATE ROLE magicstick WITH LOGIN PASSWORD 'your-password';"
   sudo -u postgres psql -c "CREATE DATABASE magicstick_clean OWNER magicstick;"
   ```
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `JWT_SECRET`,
   and the `ADMIN_EMAIL`/`ADMIN_PASSWORD` you want for the first staff login.
   Also set `ALLOWED_ORIGINS` to your deployed site's URL (falls back to
   allowing `http://localhost:*` if left unset, for local dev only), and
   `TRUST_PROXY=true` only if this actually runs behind a reverse proxy.
3. Install dependencies and seed the database (creates the tables via
   `sequelize.sync()`, then the two service categories, the seven real
   services from the site, and your admin login):
   ```bash
   cd apps/magicstick-clean/server
   npm install
   npm run seed
   ```
4. Start the server:
   ```bash
   npm start
   ```
   Visit `http://localhost:3001` — links to a staff login page and a
   services dashboard.

`migrations/001_init.sql` documents the same schema as plain SQL, in case
you'd rather provision it by hand instead of via `npm run seed`.

## API

- `GET /api/services` — public. Lists active services with their category.
- `POST /api/services` — requires `Authorization: Bearer <token>` from
  `/api/login`. Creates a service and records it in `activity_logs`.
- `POST /api/login` — body `{ "email": "...", "password": "..." }`. Returns
  `{ token, user }` on success; the token is a 7-day JWT. Rate-limited to 10
  attempts per 15 minutes per IP; every failed attempt against a real email
  is recorded in `activity_logs` as `LOGIN_FAILED`.

## Security

- **CORS**: only origins listed in `ALLOWED_ORIGINS` may call this API from
  a browser.
- **Rate limiting**: 300 requests / 15 min per IP across the whole API, 10 /
  15 min on `/api/login` specifically.
- **Security headers**: [helmet](https://helmetjs.github.io/) is applied to
  every response (CSP, HSTS, `X-Content-Type-Options`, no `X-Powered-By`, ...).
- **Input validation**: request bodies are validated (email format, string
  length limits, non-negative price, an allowed-values check on `status`)
  before touching the database.
- Every async route handler is wrapped so a thrown/rejected error reaches a
  single error-handling middleware — never an unhandled rejection, and never
  leaks internal error text back to the client.
