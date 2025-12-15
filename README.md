# Quicky — Quick Start

This document helps a new dev run the app locally, seed data, and validate with tests and a browser smoke.

## Prerequisites
- Node.js 18+
- A local database configured via `.env` (see backend `.env.example`)

## Backend
1. Install deps and configure env:
```powershell
Push-Location "C:\Users\solos\Desktop\quicky\backend"
npm i
# copy .env.example to .env and fill required vars
```
2. Run Prisma migrations and seed demo data:
```powershell
npm run prisma:migrate
npm run seed
```
3. Start the server:
```powershell
npm run dev
# Health: GET /health, DB: GET /health/db
```
4. Run tests:
```powershell
npm test
# Expected: all suites passing
```

## Frontend
1. Install deps:
```powershell
Push-Location "C:\Users\solos\Desktop\quicky\frontend"
npm i

### Phase 2 Verification Tips
- Auth refresh:
```powershell
```
2. Start Vite dev server:
```
- Polling cadence:
```powershell
```powershell
npm run dev
# Vite serves on http://localhost:5173/ (or 5174)
```
- Combined Login/Signup + OTP:
```powershell
```
3. Playwright smoke (browser E2E):
```
```powershell
npx playwright install --with-deps
$env:BASE_URL="http://localhost:5174" # adjust if needed
npx playwright test
```
- OTP email dev mode: If using a dev mailer, log OTP codes to the console/backend logs for local verification.
- The smoke validates login flow, refresh-on-401, and dashboard navigation.

## Notes
- API proxy: Frontend proxies `/api` to the backend; ensure the backend is running.
- Auth: Access token in-memory; refresh via httpOnly cookie on 401; consistent error envelopes.
- Pagination: Cursor-based with `meta.nextCursor` across Teams, Lists, Tasks, and Messages.
- Hardening: Request IDs, CORS restricted to dev origins, rate limiting on auth, Helmet security headers.

## Troubleshooting
- Playwright `net::ERR_CONNECTION_REFUSED`: Ensure Vite is running; set `BASE_URL` to the correct port.
- Seeds not visible: Re-run seed and check DB health endpoint.
- CORS issues: Confirm dev origins and proxy configuration.

For deeper architecture and current execution context, see `docs/architecture.md` and `docs/quicky-full-context.md`. Progress is tracked in `docs/build-plan.md`.
