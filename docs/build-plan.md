# Ops MVP — Build Plan and Progress (Living Doc)

Purpose: This is the authoritative, step-by-step build plan with verification gates. Update this document immediately whenever any step advances, including status, evidence, and notes. Treat it as the primary progress ledger for the project.

Status values: not-started | in-progress | blocked | completed

Update protocol:
- On any material change: update status, timestamp, evidence (commit/PR, file paths, test notes), and next action.
- Keep [docs/architecture.md](architecture.md) and [docs/quicky-full-context.md](quicky-full-context.md) aligned with actual implementation.
- Add blockers clearly with owner and mitigation.

Last updated: <to be updated on each change>

---

## Summary (Checklist)
- [ ] 1. Backend foundation (Express + TS)
- [ ] 2. Config and env management
- [ ] 3. Prisma setup + initial migrate
- [ ] 4. Core schema models + indexes
- [ ] 5. JWT auth + OTP + bcrypt
- [ ] 6. Auth routes + middleware
- [ ] 7. Users endpoints
- [ ] 8. Organizations + RBAC
- [ ] 9. Invites flow
- [ ] 10. Teams and Lists
- [ ] 11. Tasks CRUD + status
- [ ] 12. Task messages (chat)
- [ ] 13. Activation metrics endpoint
- [ ] 14. Frontend scaffold (Vite React TS)
- [ ] 15. API client + proxy + refresh
- [ ] 16. Auth UI + session persistence
- [ ] 17. Org selection page logic
- [ ] 18. Dashboard columns + mobile nav
- [ ] 19. Logging, errors, security
- [ ] 20. Seeds + demo data
- [ ] 21. E2E sanity pass
- [ ] 22. Docs sync and cleanup

---

## Detailed Steps

1) Backend foundation (Express + TS)
- Status: not-started
- Goal: Scaffold Node.js + TypeScript Express app in backend/ with `app.ts`, `server.ts`, health route, unified JSON error handler.
- Acceptance: `npm run dev` serves `/health` returning `{ status: "ok" }`.
- Evidence: dev server output, curl/HTTP response.
- Next action: Initialize package.json, tsconfig, scripts, basic app.

2) Config and env management
- Status: not-started
- Goal: Config loader (dotenv), typed env validation, `.env.example` with `PORT`, `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `BCRYPT_ROUNDS`.
- Acceptance: Missing vars fail fast with clear error.
- Evidence: Startup logs and thrown validation error when vars absent.

3) Prisma setup + initial migrate
- Status: not-started
- Goal: Install Prisma, init `schema.prisma`, generator/client, first migration.
- Acceptance: DB connects; migration table exists; client generates.
- Evidence: `prisma migrate dev` output; generated client.

4) Core schema models + indexes
- Status: not-started
- Goal: Implement `User`, `Organization`, `Membership`, `Team`, `TaskList`, `Task`, `TaskMessage`, `Invite` with enums and indexes (see architecture.md).
- Acceptance: Migration applies; relations validate; indexes present.
- Evidence: Prisma studio/introspection; SQL migration content.

5) JWT auth + OTP + bcrypt
- Status: not-started
- Goal: Access (short) + refresh (long) tokens, bcrypt hashing, OTP fields/expiry.
- Acceptance: Unit test stubs show hash/verify; token sign/verify; cookie options (httpOnly, secure in prod).
- Evidence: Test outputs; manual token decode.

6) Auth routes + middleware
- Status: not-started
- Goal: `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/otp/request`, `/auth/otp/verify`; `auth` middleware, org context resolver.
- Acceptance: Happy-path login/refresh/logout pass; 401/403 enforced.
- Evidence: Postman/Insomnia collection results.

7) Users endpoints
- Status: not-started
- Goal: `GET /users/me`, `PATCH /users/me` with validation.
- Acceptance: Authenticated calls return/update current user; 422 on invalid.
- Evidence: API responses and validation errors.

8) Organizations + RBAC
- Status: not-started
- Goal: `POST /orgs`, `GET /orgs`, `GET /orgs/:id`, members list, role updates with `requireRole(OWNER|ADMIN)`.
- Acceptance: Role checks enforced; unique membership per (user, org).
- Evidence: API responses; negative tests for role violations.

9) Invites flow
- Status: not-started
- Goal: `POST /orgs/:id/invites` (one-time, 14d default), `POST /invites/accept` (token).
- Acceptance: Expired/used blocked; accepting creates MEMBER; invite invalidated.
- Evidence: DB state before/after; API responses.

10) Teams and Lists
- Status: not-started
- Goal: POST/GET teams (org); POST/GET lists (team) with pagination.
- Acceptance: Org scoping enforced; pagination metadata present.
- Evidence: API response `meta` and DB filters.

11) Tasks CRUD + status
- Status: not-started
- Goal: `POST/GET /lists/:listId/tasks`, `GET/PATCH /tasks/:taskId` (status, owner, fields).
- Acceptance: Indexed filters; pagination; status transitions persisted.
- Evidence: Query plans or timing; response envelopes.

12) Task messages (chat)
- Status: not-started
- Goal: `GET/POST /tasks/:taskId/messages` with pagination and chronological order.
- Acceptance: Lazy load older messages; consistent envelope.
- Evidence: Paged responses; creation timestamps.

13) Activation metrics endpoint
- Status: not-started
- Goal: Compute activation: ≥3 users AND week-1 tasks ≥ users.
- Acceptance: Endpoint returns activation per org; seeded test passes.
- Evidence: Test case and API response.

14) Frontend scaffold (Vite React TS)
- Status: not-started
- Goal: Initialize Vite app with Router and providers.
- Acceptance: `npm run dev` serves routes.
- Evidence: Browser renders route placeholders.

15) API client + proxy + refresh
- Status: not-started
- Goal: Vite proxy `/api` → backend; API client with auth header and 401 refresh retry.
- Acceptance: Expired access auto-refreshes and retries once.
- Evidence: Network trace showing 401 → refresh → retry success.

16) Auth UI + session persistence
- Status: not-started
- Goal: Login/Register/OTP views; in-memory access token; refresh-on-load; minimal localStorage (e.g., `lastOrgId`).
- Acceptance: Refreshing page keeps session; logout clears state/storage.
- Evidence: Manual test flows.

17) Org selection page logic
- Status: not-started
- Goal: Create org, list invites, accept invite; skip after selection, later accessible via org switcher.
- Acceptance: Flows mirror product rules; navigate to dashboard.
- Evidence: UI flow recording.

18) Dashboard columns + mobile nav
- Status: not-started
- Goal: 4-column desktop (Teams, Lists, Tasks, Chat) with active-column highlight/width; single-column mobile with back/forward preserving state.
- Acceptance: Selections drive dependent data; mobile nav preserves state.
- Evidence: UI interaction demo.

19) Logging, errors, security
- Status: not-started
- Goal: Pino logging with request ids, consistent error envelope, CORS, rate limiting on auth, secure cookies, input validation.
- Acceptance: Logs redact secrets; endpoints respect limits.
- Evidence: Logs and rate-limit behavior.

20) Seeds + demo data
- Status: not-started
- Goal: Prisma seed to create sample org/users/teams/lists/tasks/messages.
- Acceptance: Fresh DB populated for QA quickly.
- Evidence: Seed run output; DB inspection.

21) E2E sanity pass
- Status: not-started
- Goal: Manual checklist/script across login → org create/invite accept → teams/lists/tasks/messages → dashboard nav.
- Acceptance: All steps pass; no console errors.
- Evidence: Checklist results.

22) Docs sync and cleanup
- Status: not-started
- Goal: Update [docs/quicky-full-context.md](quicky-full-context.md) execution state; sync [docs/architecture.md](architecture.md); add root README with quick-start.
- Acceptance: Docs match reality; quick-start verified by a new dev.
- Evidence: PR with docs changes and validation notes.
