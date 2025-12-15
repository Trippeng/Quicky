# Testing & Verification

Pre-requisites
- Backend running: `npm run dev` from `backend/`
- Health check: `Invoke-RestMethod http://127.0.0.1:4000/health`

PowerShell Scripts (backend/scripts)
- verify-step-9.ps1 — add member flow (RBAC)
- verify-invites.ps1 — create/accept invite, verify membership
- verify-teams-lists.ps1 — org → team → list creation and listings
- verify-tasks.ps1 — tasks create/list/get/patch with filters & pagination
- verify-messages.ps1 — post and paginate messages (ascending order)

Expected Results (high level)
- Success responses: `{ status: "ok", data, meta? }`
- Error responses: `{ status: "error", message? }` and, for validation, `{ errors: [...] }`
- Pagination: first page has `meta.nextCursor` when more; last page is `null`
- RBAC: modifying an OWNER role returns 403
- Auth precedence: unauthenticated routes may return `401` before `403/404` checks; tests should allow `401` alongside `400/403/404` for unauthenticated calls.

Tips
- Use `127.0.0.1` (IPv4) in URLs on Windows
- If a script fails, re-check auth token acquisition and server logs
 - Jest: run `npm test` in `backend/`; current suites: `auth.test.ts`, `teams.test.ts`, `lists_tasks_messages.test.ts`. All green as of 2025-12-15.
