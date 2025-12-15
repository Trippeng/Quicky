## Dev CORS Ports
- Symptom: Browser console/network shows CORS errors or backend logs `Not allowed by CORS`.
- Cause: Vite may run on 5173 or 5174; backend CORS restricts origins.
- Fix: Backend CORS allows `http://localhost:5173`, `http://localhost:5174`, `http://127.0.0.1:5173`, `http://127.0.0.1:5174` in development. Ensure frontend runs on one of these.
- Verify:
	- Start backend and frontend.
	- Call `/api/auth/refresh` from the app; response should include `access-control-allow-origin` matching your frontend origin.

## 401/403 Expected Cases
- 401 Unauthorized:
	- Missing or invalid access token; refresh may be attempted automatically by the client.
	- Fix: Login again or ensure refresh cookie exists and `/api/auth/refresh` succeeds.
- 403 Forbidden:
	- Accessing org/team/list resources without membership or insufficient role.
	- Fix: Join org via invite or switch to an org where you have access; adjust role if needed.

## Tests and Status Codes
- Supertest calls without auth will hit 401 first on protected routes.
- Current suites accept 401 alongside 400/403/404 depending on auth state and resource existence.
- For strict validation checks (expecting 400), add authenticated variants: perform login, set the access token header, then call create/patch endpoints.
- If tests return 403/404 unexpectedly, verify that org/team/list/task IDs exist and belong to the authenticated user.

## Validation Errors (400)
- Payloads failing validation return `{ status: 'error', message: 'Invalid payload', errors: [...] }` with detailed zod issues.
- Fix: Adjust request body to match schemas documented in `docs/API.md` and code routes.
# Troubleshooting — Local API Connectivity

Context: On Windows, repeated attempts to call `/health` reported timeouts from PowerShell, while the dev server printed "API listening". Root cause was likely IPv6/IPv4 and terminal-session binding quirks.

What we changed:
- Added `HOST` support in backend to bind explicitly.
- Updated server to `listen(PORT, HOST)`.
- Set `HOST=127.0.0.1` in backend `.env`.

How to recover quickly:
1) Free the port and start in foreground
```
$conn = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
Push-Location "C:\Users\solos\Desktop\quicky\backend"
npm run dev
```
2) Use IPv4 loopback explicitly for checks
```
Invoke-RestMethod -Method GET -Uri "http://127.0.0.1:4000/health"
```
3) If using another terminal, ensure it’s not blocked by profiles/proxy. Try `Invoke-WebRequest` as a cross-check and temporarily disable VPNs/firewalls if needed.

Automated verification scripts:
- Step 9 (members): `backend/scripts/verify-step-9.ps1`
- Step 9 (invites): `backend/scripts/verify-invites.ps1`

If issues persist:
- Confirm `.env` values and that `PORT` is free.
- Run `netsh interface ipv6 show prefixpolicies` and prefer IPv4 for localhost (advanced).
- As a last resort, bind to `0.0.0.0` for LAN testing and curl from WSL.

---

Additional scenarios

Prisma migrate errors
- Ensure DB reachable (`DATABASE_URL` correct); run `npx prisma generate` before migrate.
- Reset local dev DB when needed: `npx prisma migrate reset` (destructive — dev only).

PostgreSQL connectivity
- Verify Postgres service is running; test with `psql`.
- For Dockerized DBs, confirm the container port mapping and host (`127.0.0.1`).

Cookies on localhost
- Refresh tokens use httpOnly cookies; on dev, avoid mixing hosts/ports across tabs.
- If cookies not set, check SameSite policy and CORS; prefer same-origin during dev via Vite proxy.

Cache and module issues
- When deps go sideways: `rimraf node_modules`, then `npm ci` and retry.
- Clear ts-node/tsconfig build caches if using ts-node-dev.