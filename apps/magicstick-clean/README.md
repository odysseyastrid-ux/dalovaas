# Magicstick Clean — Website

A one-page website for Magicstick Clean (residential + commercial cleaning,
serving Clarence-Rockland, Ottawa, and Gatineau).

## Structure

```
index.html          Page markup
css/styles.css       All styling
js/script.js         City-selector popup, mobile menu, FAQ accordion, quote form
assets/              Downloadable flyers (linked from the "Flyers" section)
```

No build step, no dependencies. It's plain HTML/CSS/JS.

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

## Notes

- The "Send quote request" form doesn't have a backend. It opens the visitor's
  email app with a pre-filled message addressed to magicstickclean@gmail.com.
  If you want it to submit silently instead, you'd need a form backend
  (e.g., Formspree, Netlify Forms) — ask Claude Code to wire that in.
- Fonts (Libre Baskerville, Work Sans) load from Google Fonts over the
  network, so an internet connection is needed for them to render correctly.
