# Quicky — Quick Start

> This README is a quick-start guide only.  
> It is not an authoritative source of architecture or system behavior.

This document helps a developer run the app locally and verify that the system is working.


## Prerequisites

- Node.js 18+
- PostgreSQL (local or containerized)
- Git

Backend configuration uses environment variables.
See `backend/.env.example`.


## Backend

### Install dependencies and configure environment

```powershell
Push-Location "C:\Users\solos\Desktop\quicky\backend"
npm install
# Copy .env.example to .env and fill required values

Run migrations and seed data
npm run prisma:migrate
npm run seed

Start the server
npm run dev

Verify:

Health check: GET http://127.0.0.1:4000/health

Run backend tests
npm test
Expected: all test suites pass.


---

## 4) Frontend

```md
## Frontend

### Install dependencies

```powershell
Push-Location "C:\Users\solos\Desktop\quicky\frontend"
npm install
Start the Vite dev server
npm run dev

The app will be available at:

http://localhost:5173

http://localhost:5174

Run browser smoke tests (Playwright)

npx playwright install --with-deps
$env:BASE_URL="http://localhost:5174" # adjust if needed
npx playwright test

The app will be available at:

http://localhost:5173

http://localhost:5174

Run browser smoke tests (Playwright)

The app will be available at:

http://localhost:5173

http://localhost:5174

Run browser smoke tests (Playwright)

The app will be available at:

http://localhost:5173

http://localhost:5174

Run browser smoke tests (Playwright)