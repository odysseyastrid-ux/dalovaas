# CLAUDE.md - Agency Landscaping Monorepo Guidelines

## Project Architecture
This project is a decoupled client/agency architecture:
- `frontend/`: Client-facing Next.js 14+ (App Router, Tailwind CSS, TypeScript). Hosted on Vercel.
- `backend/`: Centralized Agency REST API (Node.js, Express, Prisma ORM, PostgreSQL). Hosted on Railway/Render.

## Multi-Tenant Security & API Contract
- The frontend must pass an `x-client-key` header with every API request.
- The backend validates `x-client-key` in middleware against `CLIENT_CONFIGS` before accepting lead submissions.

## Key Development Commands
### Backend (`/backend`)
- `npm run dev`: Start Express server with Nodemon on port 5000.
- `npx prisma db push`: Sync Prisma schema with database.
- `npx prisma studio`: Open GUI database inspector.

### Frontend (`/frontend`)
- `npm run dev`: Start Next.js dev server on port 3000.
- `npm run build`: Type-check and build production Next.js bundle.

## Code Conventions
- **TypeScript**: Strict typing on all API request/response interfaces in `/frontend/src/types`.
- **Tailwind**: Use semantic colors (`emerald` for landscaping themes, `slate` for neutral backgrounds).
- **API Errors**: Always wrap Express route handlers in try/catch and return standardized JSON `{ success: boolean, error?: string, data?: any }`.
