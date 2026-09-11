# Landscaping Agency App

Decoupled client/agency architecture for landscaping client landing pages:

- `frontend/` — client-facing Next.js (App Router, Tailwind CSS, TypeScript)
  landing page for ProScapes Ottawa. Hosted on Vercel.
- `backend/` — centralized agency REST API (Node.js, Express) that ingests
  quote requests from every client site, validated by an `x-client-key`
  header. Hosted on Railway/Render.

See `CLAUDE.md` for architecture, commands, and conventions.

## Quick start

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev        # http://localhost:5000

# Frontend (in a separate terminal)
cd frontend
npm install
cp .env.local.example .env.local
npm run dev         # http://localhost:3000
```
