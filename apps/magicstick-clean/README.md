# Magicstick Clean — Website

A one-page website for Magicstick Clean (residential + commercial cleaning,
serving Clarence-Rockland, Ottawa, and Gatineau).

## Structure

```
index.html           Home page
booking.html          Online booking + Stripe deposit checkout
account.html          Customer sign up / log in / booking history
admin.html            Owner dashboard (quote requests + bookings)
css/styles.css        All styling
js/script.js          City-selector popup, mobile menu, FAQ accordion, quote form
js/config.js           Backend connection settings (blank = backend off)
js/supabaseClient.js   Shared Supabase client helper
js/booking.js          booking.html logic
js/account.js          account.html logic
js/admin.js            admin.html logic
supabase/              Database schema, seed data, and edge functions for the backend
assets/                Downloadable flyers (linked from the "Flyers" section)
```

No build step, no npm dependencies for the frontend — it's plain HTML/CSS/JS,
optionally talking to a Supabase backend loaded from a CDN script tag.

## Running it locally

Just open `index.html` in a browser. For the smoothest experience (some
browsers restrict local file access oddly), serve it with a tiny local
server instead:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Editing with Claude Code

Open this folder in Claude Code and describe what you want changed, e.g.:

```
claude
> update the pricing in the Standard Cleaning row to $140
```

Claude Code can read and edit `index.html`, `css/styles.css`, and
`js/script.js` directly.

## Deploying

This is a static site, so any static host works:

- **GitHub Pages** — push this folder to a repo, enable Pages in repo settings.
- **Netlify / Vercel** — drag-and-drop this folder in their dashboard, or connect a repo.
- **Any basic web host** — upload the folder via FTP; make sure `assets/`
  stays alongside `index.html` or the flyer download links will break.

## Backend (quote capture, online booking, accounts, owner dashboard)

By default `js/config.js` is blank, so the site runs exactly as before: the
quote form opens the visitor's email app, and `booking.html`/`account.html`/
`admin.html` show a "not turned on yet" notice instead of a form.

**See [SETUP.md](SETUP.md)** for the full walkthrough to turn on the real
backend: Supabase (database + auth + serverless functions), Resend (email
notifications), and Stripe (booking deposits). Once connected:

- The quote form saves to a real database instead of just emailing.
- `booking.html` lets visitors book a service, pick a date, and pay a
  deposit online via Stripe Checkout.
- `account.html` lets customers create an account and see their booking history.
- `admin.html` is a password-protected dashboard to see and manage every
  quote request and booking.

## Notes

- Fonts (Libre Baskerville, Work Sans) load from Google Fonts over the
  network, so an internet connection is needed for them to render correctly.
