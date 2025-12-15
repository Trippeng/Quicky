# DEV.md

## Purpose

This document describes **how to run, configure, and work on the project locally**. It consolidates all developer‑facing operational knowledge.

It is authoritative for local development only. It does not define architecture or product behavior.

---

## Local Development Setup

### Prerequisites

- Node.js (LTS)
- npm
- Git
- PostgreSQL (local install or Docker)
- VS Code

---

## Environment Variables

### Backend (Node / Express)

Required:
- `DATABASE_URL` – PostgreSQL connection string
- `JWT_SECRET` – JWT signing secret
- `REFRESH_TOKEN_SECRET` – refresh token secret

Optional (with defaults):
- `PORT` – API port (default: 4000)
- `HOST` – bind address (default: `127.0.0.1` on Windows)
- `LOG_LEVEL` – pino log level (default: `info`)
- `BCRYPT_ROUNDS` – bcrypt salt rounds (default: 10)

Guidelines:
- Never commit real secrets
- Keep `.env.example` up to date
- Refresh tokens are httpOnly cookies and must never be exposed to frontend JS

---

## Running the Backend

From `backend/`:

```bash
npm install
npm run dev
```

Health check:
```bash
Invoke-RestMethod http://127.0.0.1:4000/health
```

Use `127.0.0.1` instead of `localhost` on Windows to avoid IPv6 issues.

---

## Database & Prisma

- Prisma is the single source of truth for schema
- Schema location: `backend/prisma/schema.prisma`

Common commands:
```bash
npx prisma generate
npx prisma migrate dev
```

Dev reset (destructive, dev only):
```bash
npx prisma migrate reset
```

---

## Frontend Dev Server

- Frontend runs via Vite
- Default port: 5173 or 5174

### Vite API Proxy

All `/api` requests are proxied to the backend.

Example (`vite.config.ts`):
```ts
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:4000',
      changeOrigin: true,
    },
  },
}
```

---

## Common Issues & Fast Recovery

### CORS Errors

- Ensure frontend runs on 5173 or 5174
- Backend allows:
  - `http://localhost:5173`
  - `http://localhost:5174`
  - `http://127.0.0.1:5173`
  - `http://127.0.0.1:5174`

Verify by calling `/api/auth/refresh` and checking response headers.

---

### 401 vs 403

- `401 Unauthorized`: missing or invalid auth; refresh may be attempted
- `403 Forbidden`: authenticated but insufficient org membership or role

---

### Backend Appears Running but Requests Timeout (Windows)

Quick recovery:
1) Free the port
```powershell
$conn = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
```
2) Restart backend in foreground
```powershell
npm run dev
```
3) Use IPv4 explicitly (`127.0.0.1`)

---

## What This Document Is Not

- Not an architecture description
- Not a build plan
- Not a troubleshooting encyclopedia

Edge cases and historical notes belong in `/docs/reference/`.

