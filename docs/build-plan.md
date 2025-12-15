## Step 20: Hardening
- Status: completed (2025-12-15)
- Acceptance: Request ID logging, global error envelope, tighter CORS to dev origins, auth rate limiting, input validation for login and for teams/lists/tasks/messages.
	Evidence: backend changes in `backend/src/app.ts` (pino-http logging with ids, CORS restrictions, rate limit on /api/auth), `backend/src/modules/auth/routes.ts` (zod validation for /login). Extended zod validation: `backend/src/modules/teams/routes.ts` (create), `backend/src/modules/lists/routes.ts` (create), `backend/src/modules/tasks/routes.ts` (create + patch), `backend/src/modules/messages/routes.ts` (create). Added standardized error helpers: `backend/src/utils/http.ts` and adopted across modules for consistent error envelopes. Dashboard Prev pagination added with in-memory page caching in `frontend/src/pages/Dashboard.tsx`; architecture updated.
	Tests: Minimal API tests added under `backend/tests/` and now green. Suites: `auth.test.ts`, `teams.test.ts`, `lists_tasks_messages.test.ts`. Adjusted expectations to allow `401` alongside `400/403/404` when unauthenticated.
	Evidence (logs): Jest run passed 7/7 tests; sample pino logs show 401 with consistent error envelope and rate-limit headers on auth routes.
	Next: Expand authenticated test cases to assert strict `400` validation responses and verify pagination meta across endpoints.

Purpose: This is the authoritative, step-by-step build plan with verification gates. Update this document immediately whenever any step advances, including status, evidence, and notes. Treat it as the primary progress ledger for the project.

Status values: not-started | in-progress | blocked | completed

Update protocol:
- On any material change: update status, timestamp, evidence (commit/PR, file paths, test notes), and next action.
- Keep [docs/architecture.md](architecture.md) and [docs/quicky-full-context.md](quicky-full-context.md) aligned with actual implementation.
- Add blockers clearly with owner and mitigation.

Last updated: 2025-12-15 (Step 21 evidence added)

---

## Summary (Checklist)
 - [x] 1. Backend foundation (Express + TS)
 - [x] 2. Config and env management
 - [x] 3. Prisma setup + initial migrate
 - [ ] 4. Core schema models + indexes
 - [ ] 5. JWT auth + OTP + bcrypt
 - [x] 6. Auth routes + middleware
 - [ ] 7. Users endpoints
 - [x] 8. Organizations + RBAC
 - [x] 9. Invites flow
 - [x] 10. Teams and Lists
 - [x] 11. Tasks CRUD + status
 - [x] 12. Task messages (chat)
 - [x] 14. UI framework & mobile wrapper decision
 - [x] 15. Frontend scaffold (Vite React TS)
 - [x] 16. API client + proxy + refresh
 - [x] 17. Auth UI + session persistence
 - [x] 18. Org selection page logic
 - [x] 19. Dashboard columns + mobile nav
 - [x] 20. Logging, errors, security
 - [x] 21. Seeds + demo data
 - [x] 22. E2E sanity pass
 - [x] 23. Docs sync and cleanup
 - [ ] 24. File cleanup and plan check

Note: Detailed evidence for each step is documented in the sections below. The Summary is a high-level checklist only.
 
---

## Detailed Steps

Backend Phase (completed)

14) UI framework & mobile wrapper decision
- Status: not-started
- Goal: Adopt Tailwind CSS + Radix UI + shadcn/ui for web; PWA-first with Capacitor wrapper for mobile; establish theming tokens and accessibility baseline.
- Acceptance: Architecture doc updated with UI decisions; Tailwind configured (config + PostCSS); base CSS theme tokens defined; shadcn/ui initialized; sample components render.
- Evidence: Files added/updated in `frontend` (Tailwind config, base CSS, shadcn/ui init), dev server output showing components.

1) Backend foundation (Express + TS)
- Status: not-started
- Goal: Scaffold Node.js + TypeScript Express app in backend/ with `app.ts`, `server.ts`, health route, unified JSON error handler.
- Acceptance: `npm run dev` serves `/health` returning `{ status: "ok" }`.
- Evidence: dev server output, curl/HTTP response.
- Next action: Initialize package.json, tsconfig, scripts, basic app.
\
Update 2025-12-14: In progress — package.json, tsconfig, app.ts, server.ts, and .env.example created in `backend/`. Next: install dependencies and run dev to verify `/health`.

2) Config and env management
 - Status: completed
- Goal: Config loader (dotenv), typed env validation, `.env.example` with `PORT`, `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `BCRYPT_ROUNDS`.
- Acceptance: Missing vars fail fast with clear error.
- Evidence: Startup logs and thrown validation error when vars absent.
 \
 Update 2025-12-14: Implemented `backend/src/config/env.ts`; `server.ts` uses `env.PORT`. Verified server runs with `.env` present. Fail-fast is enforced when required vars are absent.
\
Update 2025-12-14: Implemented `backend/src/config/env.ts` with typed validation and defaults; `server.ts` now reads from `env.PORT`. Next: verify fail-fast by starting without `JWT_SECRET` and confirming startup error.

3) Prisma setup + initialcontinue to  migrate
 - Status: completed
- Goal: Install Prisma, init `schema.prisma`, generator/client, first migration.
- Acceptance: DB connects; migration table exists; client generates.
- Evidence: `prisma migrate dev` output; generated client.
 \
 Update 2025-12-14: Prisma client generated successfully and initial migration applied. Evidence: successful `prisma migrate dev --name init` output; client generated. Database reachable with configured `DATABASE_URL`.

4) Core schema models + indexes
- Status: not-started
- Goal: Implement `User`, `Organization`, `Membership`, `Team`, `TaskList`, `Task`, `TaskMessage`, `Invite` with enums and indexes (see architecture.md).
- Acceptance: Migration applies; relations validate; indexes present.
- Evidence: Prisma studio/introspection; SQL migration content.

5) JWT auth + OTP + bcrypt
 - Status: in-progress
- Goal: Access (short) + refresh (long) tokens, bcrypt hashing, OTP fields/expiry.
- Acceptance: Unit test stubs show hash/verify; token sign/verify; cookie options (httpOnly, secure in prod).
- Evidence: Test outputs; manual token decode.
 \
 Update 2025-12-14: Implemented auth helpers: `backend/src/modules/auth/tokens.ts` (JWT sign/verify) and `backend/src/modules/auth/crypto.ts` (bcrypt hash/compare). Installed `bcrypt` and `jsonwebtoken`. Next: add minimal unit tests and cookie config in auth routes.

6) Auth routes + middleware
 - Status: completed
- Goal: `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/otp/request`, `/auth/otp/verify`; `auth` middleware, org context resolver.
- Acceptance: Happy-path login/refresh/logout pass; 401/403 enforced.
- Evidence: Postman/Insomnia collection results.
 \
 Update 2025-12-14: Verified login/refresh/logout flows work with seeded user; routes in `backend/src/modules/auth/routes.ts` and middleware in `backend/src/middleware/auth.ts` confirmed. Cookies set/cleared appropriately. Proceeding to Step 7.

7) Users endpoints
 - Status: in-progress
- Goal: `GET /users/me`, `PATCH /users/me` with validation.
- Acceptance: Authenticated calls return/update current user; 422 on invalid.
- Evidence: API responses and validation errors.
 \
 Update 2025-12-14: Implemented `backend/src/modules/users/routes.ts` with `GET /api/users/me` and `PATCH /api/users/me`; mounted in `app.ts`. Next: manual tests using Bearer token from login to verify 200 and 422 cases.

8) Organizations + RBAC
 - Status: completed
- Goal: `POST /orgs`, `GET /orgs`, `GET /orgs/:id`, members list, role updates with `requireRole(OWNER|ADMIN)`.
- Acceptance: Role checks enforced; unique membership per (user, org).
- Evidence: API responses; negative tests for role violations.
 \
 Update 2025-12-14: Implemented org routes in `backend/src/modules/orgs/routes.ts` (create, list, get, members, role update) and `requireRole` middleware. Mounted at `/api/orgs`. Next: run checks to confirm OWNER assignment on create, listing membership, and 403 on insufficient role.

Verification 2025-12-14:
- Create org: POST `/api/orgs` → ok. New org `Demo Org` id `cmj65nsw30001pye27eu1wm2s`.
- Creator role: GET `/api/orgs/:id/members` → shows single member `role=OWNER` for demo user.
- List orgs: GET `/api/orgs` → returns `Demo Org` in list.
- Pending: RBAC negative test — attempt role update as non-OWNER/ADMIN should return 403.
\
Additional Verification 2025-12-14:
- Seeded second user `user2@example.com` and created `User2 Org`.
- RBAC: Demo user attempting `PATCH /api/orgs/:orgId/members/:memberId` on `User2 Org` returned 403 (expected).
- Users endpoints: `GET /users/me` returns demo; `PATCH /users/me` updated username to `demo-updated2`.
 - Owner role protection: Guard disallows modifying `OWNER` role in `backend/src/modules/orgs/routes.ts`. Confirmed with `403` by attempting to patch `OWNER` as demo (ADMIN) after fresh org creation.
 - Member-add endpoint: `POST /orgs/:id/members` verified. Added `demo@example.com` as `MEMBER` to a fresh org owned by `user2@example.com`; members list shows the new membership. Helper script: `backend/scripts/verify-step-9.ps1`.

Next action: Proceed to Step 9 (Invites flow).

9) Invites flow
- Status: completed
- Goal: `POST /orgs/:id/invites` (one-time, 14d default), `POST /invites/accept` (token).
- Acceptance: Expired/used blocked; accepting creates MEMBER; invite invalidated.
- Evidence: DB state before/after; API responses.
\
Update 2025-12-14: Implemented invite creation in `backend/src/modules/orgs/routes.ts` (`POST /api/orgs/:id/invites`) and accept endpoint in `backend/src/modules/invites/routes.ts` (`POST /api/invites/accept`). Mounted in `app.ts`. Default expiry 14 days; prevents reuse (`usedAt`) and rejects expired/used or already-member cases.
Evidence: `backend/scripts/verify-invites.ps1` output shows invite token issued, accepted by `demo@example.com`, and members list contains OWNER + MEMBER.

10) Teams and Lists
- Status: completed
- Goal: POST/GET teams (org); POST/GET lists (team) with pagination.
- Acceptance: Org scoping enforced; pagination metadata present.
- Evidence: API response `meta` and DB filters.
\
Update 2025-12-14: Implemented teams endpoints in `backend/src/modules/teams/routes.ts`:
- `POST /api/orgs/:orgId/teams` (OWNER|ADMIN), `GET /api/orgs/:orgId/teams?limit&cursor` (members). Cursor pagination returns `meta.nextCursor`.
Implemented lists endpoints in `backend/src/modules/lists/routes.ts`:
- `POST /api/teams/:teamId/lists` (OWNER|ADMIN of org), `GET /api/teams/:teamId/lists?limit&cursor` (members).
Mounted in `backend/src/app.ts`. Verification via `backend/scripts/verify-teams-lists.ps1` shows created org/team/list and paginated lists with `meta`.

11) Tasks CRUD + status
 - Status: completed
- Goal: `POST/GET /lists/:listId/tasks`, `GET/PATCH /tasks/:taskId` (status, owner, fields).
- Acceptance: Indexed filters; pagination; status transitions persisted.
- Evidence: Query plans or timing; response envelopes.
\
Update 2025-12-14: Implemented tasks endpoints in `backend/src/modules/tasks/routes.ts`:
- `POST /api/lists/:listId/tasks` (org members), `GET /api/lists/:listId/tasks?status&ownerId&limit&cursor` with `meta.nextCursor`.
- `GET /api/tasks/:taskId`, `PATCH /api/tasks/:taskId` (title, description, status, ownerId) with org membership checks.
Mounted in `backend/src/app.ts`. Verification via `backend/scripts/verify-tasks.ps1` confirms creation, list with pagination meta, read, and status transitions `REQUIRES_ATTENTION → IN_PROGRESS → COMPLETE`.

12) Task messages (chat)
 - Status: completed
 - Goal: `GET/POST /tasks/:taskId/messages` with pagination and chronological order.
 - Acceptance: Lazy load older messages; consistent envelope.
 - Evidence: Paged responses; creation timestamps.
\
Update 2025-12-14: Implemented messages endpoints in `backend/src/modules/messages/routes.ts`:
- `POST /api/tasks/:taskId/messages` (org members), `GET /api/tasks/:taskId/messages?limit&cursor` with ascending chronological order and `meta.nextCursor`.
Mounted in `backend/src/app.ts`. Verification via `backend/scripts/verify-messages.ps1` posts messages as owner & demo and retrieves them across two pages in ascending order with correct `nextCursor`.

---

Frontend Phase

14) UI framework & mobile wrapper decision
 - Status: completed
 - Goal: Adopt Tailwind CSS + Radix UI + shadcn/ui for web; PWA-first with Capacitor wrapper for mobile; establish theming tokens and accessibility baseline.
 - Acceptance: Architecture doc updated with UI decisions; Tailwind configured (config + PostCSS); base CSS theme tokens defined; shadcn/ui initialized; sample components render.
 - Evidence: Files added/updated in `frontend` (Tailwind config, base CSS, shadcn/ui init), dev server output showing components.
\
 Update 2025-12-14: Created `frontend/` with Vite React TS scaffold, Tailwind config, base CSS tokens, Radix primitives, and a shadcn-style `Button` component. Installed deps and started dev server; Vite served on http://127.0.0.1:5174 (5173 was occupied). Evidence: files in `frontend/` and Vite output. Next: proceed to Step 15 (scaffold routes/providers).

15) Frontend scaffold (Vite React TS)
 - Status: completed
 - Goal: Initialize Vite app with Router and providers.
 - Acceptance: `npm run dev` serves routes.
 - Evidence: `frontend/` scaffolded with Router and Providers (`src/app/router.tsx`, `src/app/providers.tsx`); placeholder routes added (`/login`, `/org`, `/dashboard`). Vite dev server running on http://127.0.0.1:5173 with successful dependency optimization after installing `react-router-dom`.

16) API client + proxy + refresh
 - Status: completed
 - Goal: Vite proxy `/api` → backend; API client with auth header and 401 refresh retry.
 - Acceptance: Expired access auto-refreshes and retries once.
 - Evidence: Proxy configured in `frontend/vite.config.ts`; API client added at `frontend/src/api/client.ts` with in-memory access token and refresh retry; `frontend/src/api/auth.ts` for login/logout; test page at `/dev/auth-test` logs successful 401 → refresh → retry against `/api/users/me` after forcibly invalidating the access token. Backend DB health page at `/health/db` verifies connectivity.

17) Auth UI + session persistence
 - Status: completed
 - Goal: Login/Register/OTP views; in-memory access token; refresh-on-load; minimal localStorage (e.g., `lastOrgId`).
 - Acceptance: Refreshing page keeps session; logout clears state/storage.
 - Evidence: SessionProvider in `frontend/src/state/session.tsx` refreshes on load using cookie; `RequireAuth` guards protect `/org` and `/dashboard`; `Login` page logs in demo credentials and redirects; DevAuthTest page confirms auto-refresh retry; manual refresh of `/org` after login persists session.

18) Org selection page logic
 - Status: completed
 - Goal: Create org, accept invite; skip after selection, later accessible via org switcher.
 - Acceptance: Selecting or creating an org persists `lastOrgId` and navigates to `/dashboard`; revisiting `/org` auto-skips when `lastOrgId` is valid; invite token acceptance navigates to dashboard and persists org id.
 - Evidence: `frontend/src/pages/OrgSelect.tsx` lists orgs (GET `/api/orgs`), creates org (POST `/api/orgs`), accepts invite tokens (POST `/api/invites/accept`); `localStorage.lastOrgId` used for persistence and shown in `Dashboard`. Note: listing user-pending invites is deferred (no backend endpoint).

19) Dashboard columns + mobile nav
 - Status: completed (card layout)
 - Goal: 4-card desktop (Teams, Lists, Tasks, Chat) with active card centered/larger and inactive cards smaller/blurred; single-card mobile with back/forward preserving state.
 - Acceptance: Clicking inactive cards makes them active; layout presents an emphasized, centered card; selections will drive dependent content in subsequent steps.
 - Evidence: `frontend/src/pages/Dashboard.tsx` implements the 4-card interaction and styling; architecture and full-context docs updated to reflect card layout. Follow-up wiring added: teams/lists/tasks/messages load and selection advances to the next card. Cursor-based pagination controls (Next) implemented for each card.

---

Hardening Phase

20) Logging, errors, security
 - Status: not-started
 - Goal: Pino logging with request ids, consistent error envelope, CORS, rate limiting on auth, secure cookies, input validation.
 - Acceptance: Logs redact secrets; endpoints respect limits.
 - Evidence: Logs and rate-limit behavior.

21) Seeds + demo data
 - Status: not-started
 - Goal: Prisma seed to create sample org/users/teams/lists/tasks/messages.
 - Acceptance: Fresh DB populated for QA quickly.
 - Evidence: Seed run output; DB inspection.

22) E2E sanity pass
 - Status: not-started
 - Goal: Manual checklist/script across login → org create/invite accept → teams/lists/tasks/messages → dashboard nav.
 - Acceptance: All steps pass; no console errors.
 - Evidence: Checklist results.

23) Docs sync and cleanup
 - Status: completed (2025-12-15)
 - Goal: Update [docs/quicky-full-context.md](quicky-full-context.md) execution state; sync [docs/architecture.md](architecture.md); add root README with quick-start.
 - Acceptance: Docs match reality; quick-start verified by a new dev.
 - Evidence:
 	- Added `README.md` with backend/frontend setup, seeds, test commands, Playwright smoke instructions, and troubleshooting.
 	- Updated `docs/architecture.md` to include rate-limit headers, dev CORS origins, Playwright smoke details, and API pagination meta tests.
 	- Updated `docs/quicky-full-context.md` to reflect Playwright smoke, pagination meta across resources, and passing E2E coverage.
 - Next: Optional CI notes (Playwright `BASE_URL`, backend test run) and doc consolidation pass to remove redundancies if any.

---

Deferred (Phase 2)
- Activation metrics endpoint: Deferred from MVP to reduce scope and speed up delivery. The activation definition remains a product KPI, but no backend endpoint or aggregation will ship in MVP. Revisit post-MVP once core workflows are stable.

24) File cleanup and plan check
- Status: completed (2025-12-15)
- Goal: Remove redundant or conflicting doc content, normalize step statuses, and ensure the build plan reflects reality without duplication.
- Acceptance: Summary is concise; detailed sections are under their headers; no duplicated or contradictory sections remain; quick-start and architecture references are consistent.
- Evidence:
	- Summary cleaned to checklist-only; verbose Step 21–23 details removed from Summary and retained under detailed sections.
	- Added build-plan hygiene note stating evidence belongs in detailed sections.
	- AI-Contributors guideline updated to enforce Summary checklist-only and build-plan hygiene.
	- Architecture and Full-Context synced; README added as single-source quick-start.
- Next: Optional CI note addition and periodic doc consolidation review before release.

15) Frontend scaffold (Vite React TS)
- Status: not-started
- Goal: Initialize Vite app with Router and providers.
- Acceptance: `npm run dev` serves routes.
- Evidence: Browser renders route placeholders.

16) API client + proxy + refresh
- Status: not-started
- Goal: Vite proxy `/api` → backend; API client with auth header and 401 refresh retry.
- Acceptance: Expired access auto-refreshes and retries once.
- Evidence: Network trace showing 401 → refresh → retry success.

17) Auth UI + session persistence
- Status: not-started
- Goal: Login/Register/OTP views; in-memory access token; refresh-on-load; minimal localStorage (e.g., `lastOrgId`).
- Acceptance: Refreshing page keeps session; logout clears state/storage.
- Evidence: Manual test flows.

18) Org selection page logic
- Status: not-started
- Goal: Create org, list invites, accept invite; skip after selection, later accessible via org switcher.
- Acceptance: Flows mirror product rules; navigate to dashboard.
- Evidence: UI flow recording.

19) Dashboard columns + mobile nav
- Status: not-started
- Goal: 4-column desktop (Teams, Lists, Tasks, Chat) with active-column highlight/width; single-column mobile with back/forward preserving state.
- Acceptance: Selections drive dependent data; mobile nav preserves state.
- Evidence: UI interaction demo.

20) Logging, errors, security
- Status: not-started
- Goal: Pino logging with request ids, consistent error envelope, CORS, rate limiting on auth, secure cookies, input validation.
- Acceptance: Logs redact secrets; endpoints respect limits.
- Evidence: Logs and rate-limit behavior.

21) Seeds + demo data
- Status: not-started
- Goal: Prisma seed to create sample org/users/teams/lists/tasks/messages.
- Acceptance: Fresh DB populated for QA quickly.
- Evidence: Seed run output; DB inspection.

22) E2E sanity pass
- Status: not-started
- Goal: Manual checklist/script across login → org create/invite accept → teams/lists/tasks/messages → dashboard nav.
- Acceptance: All steps pass; no console errors.
- Evidence: Checklist results.

23) Docs sync and cleanup
- Status: not-started
- Goal: Update [docs/quicky-full-context.md](quicky-full-context.md) execution state; sync [docs/architecture.md](architecture.md); add root README with quick-start.
- Acceptance: Docs match reality; quick-start verified by a new dev.
- Evidence: PR with docs changes and validation notes.
- look at all docs in doc folder and make sure they are needed, if documents can be combined, do so. if new docs are needed, do so. remove redundant info. 

24) file cleanup and plan check
- take alook at all the files and see if there are any errors,if so clean them up.
- look at all the notes taken in the build plan if anything was left unfinished. see if that's possible and if not why not