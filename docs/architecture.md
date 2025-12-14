# Architecture Reference (Ops MVP)

This is a living, authoritative reference for the full-stack Ops MVP. It documents components, decisions, and data flows so future contributors can extend the system safely and consistently.

Decision Note: The prior grounding doc used node-pg-migrate for migrations. This architecture adopts Prisma ORM (with Prisma Migrate) as an explicit override. Keep both documents in sync; Prisma is the current source of truth for schema and migrations.

## 1. Project Overview
- Goal: Lightweight Ops management across web and mobile (PWA-first), optimized for fast onboarding and simple task collaboration.
- Stack:
  - Backend: Node.js + TypeScript + Express
  - Frontend: React + TypeScript + Vite
  - Database: PostgreSQL + Prisma ORM (Prisma Migrate)
  - State: Local component state + lightweight global state; localStorage for select persistence (e.g., last org, view state)
- Core domains: Authentication, Organizations, Teams, Task Lists, Tasks, Task Chat, Invites, Roles.

### UI Framework Decisions
- Web UI: React + TypeScript + Vite with Tailwind CSS, Radix UI primitives, and shadcn/ui components for fast, accessible, and themeable UI.
- Theming: CSS variables with light/dark modes; tokenized colors and radii.
- Accessibility: Radix ensures robust A11y defaults; shadcn/ui builds on Radix semantics.
- Mobile: PWA-first experience wrapped via Capacitor for iOS/Android distribution (single codebase).
- Desktop: Responsive layout scales to larger screens without separate desktop framework.

## 2. Database & Migrations (Prisma)
- Engine: PostgreSQL
- ORM & Migrations: Prisma (schema-first, codegen types, Prisma Migrate)
- Workflow:
  1) Define/modify models in `schema.prisma`
  2) Run `prisma migrate dev --name <change>` (generates SQL + applies locally)
  3) Review generated SQL for correctness
  4) Commit Prisma schema + migration artifacts
  5) Apply to other envs via `prisma migrate deploy`

### Models (Prisma schema snapshot)
```prisma
// schema.prisma (excerpt)

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum TaskStatus {
  REQUIRES_ATTENTION
  AT_RISK
  IN_PROGRESS
  COMPLETE
}

enum OrgRole {
  OWNER
  ADMIN
  MEMBER
}

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  username       String
  passwordHash   String?  // Present when using password auth
  otpValue       String?  // Present when using email OTP
  otpExpiresAt   DateTime?
  memberships    Membership[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  // Indexes
  @@index([username])
}

model Organization {
  id           String       @id @default(cuid())
  name         String
  ownerId      String
  owner        User         @relation(fields: [ownerId], references: [id])
  memberships  Membership[]
  teams        Team[]
  invites      Invite[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  @@index([ownerId])
  @@unique([name])
}

model Membership {
  id             String        @id @default(cuid())
  userId         String
  organizationId String
  role           OrgRole       @default(MEMBER)
  user           User          @relation(fields: [userId], references: [id])
  organization   Organization  @relation(fields: [organizationId], references: [id])
  createdAt      DateTime      @default(now())
  @@unique([userId, organizationId])
  @@index([organizationId, role])
}

model Team {
  id             String        @id @default(cuid())
  name           String
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id])
  taskLists      TaskList[]
  createdAt      DateTime      @default(now())
  @@index([organizationId])
}

model TaskList {
  id        String  @id @default(cuid())
  name      String
  teamId    String
  team      Team    @relation(fields: [teamId], references: [id])
  tasks     Task[]
  createdAt DateTime @default(now())
  @@index([teamId])
}

model Task {
  id          String      @id @default(cuid())
  title       String
  description String?
  status      TaskStatus  @default(REQUIRES_ATTENTION)
  taskListId  String
  ownerId     String?
  taskList    TaskList    @relation(fields: [taskListId], references: [id])
  owner       User?       @relation(fields: [ownerId], references: [id])
  messages    TaskMessage[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  @@index([taskListId, status])
  @@index([ownerId])
}

model TaskMessage {
  id        String   @id @default(cuid())
  taskId    String
  authorId  String
  body      String
  createdAt DateTime @default(now())
  task      Task     @relation(fields: [taskId], references: [id])
  author    User     @relation(fields: [authorId], references: [id])
  @@index([taskId, createdAt])
}

model Invite {
  id             String        @id @default(cuid())
  organizationId String
  token          String        @unique
  expiresAt      DateTime
  usedAt         DateTime?
  organization   Organization  @relation(fields: [organizationId], references: [id])
  @@index([organizationId, expiresAt])
}
```

Notes:
- Primary keys are `cuid()` strings for simplicity across client/server.
- Foreign keys and indexes cover common filters (org, role, status, ownership, sort by createdAt).
- Optional partitioning for very large tables can be added later at the DB level.

## 3. Authentication & Authorization
- Tokens:
  - Access Token (JWT): short-lived (e.g., 15m), contains `sub` (user id), `orgId` (optional current org), roles/claims.
  - Refresh Token: longer-lived (e.g., 7–30d), stored in httpOnly, secure cookie; opaque or JWT. Rotated on use.
- Storage:
  - Access token: in-memory (React state); mirrored in memory only. If persisted, store minimally (e.g., last org) in localStorage.
  - Refresh token: httpOnly cookie; never accessible from JS.
- Flows:
  - Password Login: email + password → verify (bcrypt) → set refresh cookie → return access token.
  - Email OTP (MVP-capable per product context): email → set `otpValue` + `otpExpiresAt` → verify OTP → set refresh cookie → return access token.
  - Refresh: cookie refresh token → verify/rotate → new access token (and possibly new cookie).
  - Logout: revoke/rotate refresh token; clear cookie; clear client state/localStorage.
- Password rules: min 8 chars, ≥1 letter, ≥1 number; stored as bcrypt hash.
- RBAC: Role at membership level (`OrgRole`) controls org-level permissions; `OWNER` has all rights, `ADMIN` manages members/teams, `MEMBER` standard access.

### Auth Sequence (pseudo-diagram)
```
Client -> /auth/login (email, password)
Server: verify bcrypt → set refresh cookie → issue access JWT
Client: store access token in memory; proceed with API calls

Access expired → Client -> /auth/refresh (cookie)
Server: validate refresh → rotate + set new cookie → return new access JWT
```

## 4. API Structure & Calls (REST)
- Conventions:
  - Base path: `/api`
  - JSON envelope: `{ status: "ok"|"error", message?: string, data?: any, meta?: { pagination? } }`
  - Pagination: query params `page`, `pageSize`; response `meta = { page, pageSize, total }`
  - Middleware: `auth` (access token), `requireRole`, `orgContext` (resolve current org by claim or header)
- Auth:
  - POST `/api/auth/login`
  - POST `/api/auth/refresh`
  - POST `/api/auth/logout`
  - POST `/api/auth/otp/request` and `/api/auth/otp/verify` (if OTP enabled)
- Users:
  - GET `/api/users/me`
  - PATCH `/api/users/me`
- Organizations:
  - POST `/api/orgs` (create; creator becomes OWNER)
  - GET `/api/orgs` (list mine)
  - GET `/api/orgs/:id`
  - POST `/api/orgs/:id/invites` (create invite)
  - POST `/api/invites/accept` (token)
  - GET `/api/orgs/:id/members`
  - PATCH `/api/orgs/:id/members/:memberId` (role)
- Teams & Lists:
  - POST `/api/orgs/:orgId/teams`
  - GET `/api/orgs/:orgId/teams`
  - POST `/api/teams/:teamId/lists`
  - GET `/api/teams/:teamId/lists`
- Tasks & Chat:
  - POST `/api/lists/:listId/tasks`
  - GET `/api/lists/:listId/tasks`
  - GET `/api/tasks/:taskId`
  - PATCH `/api/tasks/:taskId` (status, owner, details)
  - GET `/api/tasks/:taskId/messages`
  - POST `/api/tasks/:taskId/messages`

### Errors
- 401 unauthorized, 403 forbidden, 404 not found, 422 validation, 500 server
- Example: `{ status: "error", message: "Invalid credentials" }`

## 5. Frontend Architecture
- Views:
  - Login, Registration, Org Selection, Dashboard (4-column on desktop: Teams, Task Lists, Tasks, Chat; single-column navigable on mobile), Task Details
- Routing (React Router): `/login`, `/register`, `/org`, `/dashboard`, `/tasks/:taskId`
- State:
  - Global: current user, selected organization, session status, active team/list/task
  - LocalStorage: selected organization id, lightweight UI prefs; avoid storing tokens
- API Client:
  - `fetch` or Axios with request interceptors to attach access token; automatic refresh flow on 401 when refresh cookie exists
- Session Persistence:
  - On load: if access token missing, call `/auth/refresh`; if success, hydrate session; else route to `/login`

### UI Stack Details
- Tailwind CSS: utility-first for rapid responsive design.
- Radix UI: unstyled, accessible primitives for complex components (dialogs, dropdowns, tabs).
- shadcn/ui: curated component library built on Radix; consistent styling and theming via Tailwind.
- Theme tokens: defined in CSS variables to enable dynamic theming and consistency across components.

### Frontend Pseudo-Structure
```
frontend/src/
├─ app/
│  ├─ router.tsx
│  ├─ providers.tsx (AuthProvider, QueryClientProvider optional)
├─ pages/
│  ├─ Login.tsx
│  ├─ Register.tsx
│  ├─ OrgSelect.tsx
│  └─ Dashboard/
│     ├─ TeamsColumn.tsx
│     ├─ ListsColumn.tsx
│     ├─ TasksColumn.tsx
│     └─ ChatColumn.tsx
├─ components/
├─ api/
│  ├─ client.ts (base client + interceptors)
│  ├─ auth.ts
│  ├─ orgs.ts
│  ├─ teams.ts
│  ├─ lists.ts
│  └─ tasks.ts
├─ state/
│  ├─ session.ts
│  └─ ui.ts
└─ utils/
```

## 6. State & Local Storage
- Keep session in memory; on first mount, attempt refresh to hydrate
- Persist lightweight values in localStorage: `lastOrgId`, `ui:activeColumn`
- Sync across tabs (optional): listen to `storage` events; if logout in one tab, clear others
- On logout: clear local state and localStorage keys

## 7. Security & Best Practices
- Refresh tokens only in httpOnly, secure cookies; never expose in JS
- Validate inputs both client- and server-side; sanitize outputs where needed
- Use environment variables for secrets (`JWT_SECRET`, `DATABASE_URL`, bcrypt salt rounds)
- Protect DB from injection via Prisma (parameterized); validate custom SQL if any
- Rate-limit auth endpoints; lockout/backoff on repeated failures
- CORS restricted to dev origins in development; strict in production

## 8. Backend Architecture
- Structure (suggested):
```
backend/src/
├─ app.ts (Express init, middleware)
├─ server.ts (bootstrap)
├─ config/
│  └─ env.ts
├─ middleware/
│  ├─ auth.ts (JWT verify)
│  ├─ orgContext.ts
│  └─ requireRole.ts
├─ modules/
│  ├─ auth/
│  │  ├─ routes.ts
│  │  ├─ controller.ts
│  │  └─ service.ts
│  ├─ users/
│  ├─ orgs/
│  ├─ teams/
│  ├─ lists/
│  └─ tasks/
├─ db/
│  ├─ prisma.ts (singleton client)
│  └─ seed.ts
└─ utils/
```
- Middlewares: request id, logging (pino), error handler with consistent JSON envelope
- Pagination helper: maps `page`/`pageSize` → `skip`/`take`; returns `total`
- Services isolate business logic; controllers adapt HTTP to services; routes are thin

## 9. Data Flows (Key)

### Org Creation
```
Client -> POST /api/orgs (name)
Server: create org; membership OWNER; return org
Client: update session org; navigate to dashboard
```

### Invite Link Acceptance
```
Client -> POST /api/invites/accept (token)
Server: validate (exists, not used, not expired) → add membership MEMBER → mark used → return org
Client: set current org; navigate to dashboard
```

### Dashboard Column Selection (Desktop)
```
Teams click → load lists
Lists click → load tasks
Task click → load messages
```

### Mobile Navigation
```
Back/forward arrows switch between Teams → Lists → Tasks → Chat
Preserve selection across views
```

## 10. Logging & Observability
- Logging: pino with request-scoped ids; redact secrets
- Error reporting: hook for external service (e.g., Sentry) optional in production
- Metrics (optional): basic counters for requests, errors; activation metrics per product definition

## 11. Environment & Dev Setup (aligned)
- Backend: Node LTS; `.env` with `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `PORT`
- Frontend: Vite dev server at 5173; proxy `/api` → backend port
- Commands (indicative):
```
# Backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev

# Frontend
npm install
npm run dev
```

## 12. Extensibility
- Modular: add modules under `modules/` (controllers/services/routes) with strong typing
- WebSockets (future): add for live task/chat updates; keep HTTP REST as source of truth
- Background jobs: for invite cleanup, metrics aggregation, OTP expiry

## 13. Consistency Checklist
- Types: shared TypeScript types for API contracts (generate from Prisma or hand-maintained DTOs)
- Responses: always use JSON envelope and consistent error shapes
- Pagination: mandatory for list endpoints; validate bounds
- Indexes: ensure query patterns match Prisma findMany filters with proper indexes

---

Maintenance: Update this file whenever design decisions change (e.g., auth TTLs, roles, routes, schema). Link PRs that modify architecture-critical elements for traceability.
