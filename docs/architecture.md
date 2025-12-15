# ARCHITECTURE.md

## Purpose

This document is the **authoritative snapshot of how the system works right now**. It describes the current architecture, invariants, and contracts that implementation must follow.

It intentionally excludes:
- Historical reasoning
- Competitive analysis
- Future ideas
- Product strategy details

If a detail is not here, it is not guaranteed.

---

## System Overview

The system is a lightweight, org‑scoped operations management application with a web frontend and a stateless backend API.

High‑level characteristics:
- Multi‑tenant via organizations
- Stateless backend
- JWT‑based authentication with refresh flow
- Cursor‑paginated APIs
- PWA‑first frontend, wrapped via Capacitor for mobile

---

## Core Invariants (Non‑Negotiable)

These rules must always hold unless explicitly changed:

- All data access is **organization‑scoped**
- Users may belong to multiple organizations
- No API returns cross‑organization data
- Backend services are stateless
- Pagination is cursor‑based, not offset‑based
- Prisma is the single source of truth for schema and migrations

---

## Data Model (Conceptual)

Primary entities and relationships:

- **User**
  - Identified by email
  - May belong to multiple organizations
  - Stores auth credentials and OTP metadata

- **Organization**
  - Root tenant boundary
  - Has an owner
  - Contains teams, lists, tasks, and messages

- **Team**
  - Belongs to an organization
  - Has members (users scoped to the organization)

- **Task List**
  - Belongs to a team

- **Task**
  - Belongs to a task list
  - Has an owner
  - May have watcher members (optional)
  - May have a due date (optional)
  - Has a status

- **Task Message**
  - Belongs to a task
  - Ordered chronologically (ascending)

### Task Status Values
- Requires Attention
- At Risk
- In Progress
- Complete

---

## Authentication & Session Model

- Email‑based authentication
- Users authenticate via:
  - Password, or
  - One‑time passcode (OTP)

### Session Handling

- Short‑lived access JWT
- Longer‑lived refresh token
- Refresh tokens are stored as httpOnly cookies
- Backend is stateless with respect to sessions

### Refresh Behavior

- Client retries once on `401` by calling refresh
- If refresh fails, user is logged out

---

## Organization Context

- A user must select an active organization
- The selected organization defines all subsequent data access
- Org context is enforced server-side

### Enforcement Model (Locked)

- All org-scoped requests **must include an explicit organization identifier** via request header (for example `X-Org-Id`)
- Backend validates that the authenticated user is a member of the specified organization
- Requests missing org context are rejected

### Rules

- Org selection occurs immediately after authentication
- Once selected, the org selection screen is skipped on subsequent visits
- Org switching is only possible via an explicit UI action

---

## Authorization (RBAC)

Roles are evaluated **within an organization**:

- Owner
- Admin
- Member

Rules:
- Ownership transfer and modification is restricted
- Unauthorized access returns `403`
- Missing or invalid auth returns `401` before RBAC checks

---

## API Design Principles

- REST-style endpoints
- Stateless requests
- Consistent response envelopes
- `/api` is implicitly treated as version 1 (v1)

Explicit API versioning is deferred until breaking changes are required.

### Response Shape

- Success: `{ status: "ok", data, meta? }`
- Error: `{ status: "error", message?, errors? }`

### Pagination

- Cursor-based pagination only
- Responses include `meta.nextCursor` when more data exists

---

## Frontend Architecture

- React + TypeScript
- Built with Vite
- Uses Vite dev proxy for `/api`

### State Management (Locked)

- No global state management library is used in the MVP (Redux, Zustand, etc.)
- Global context is limited strictly to:
  - Authentication/session
  - Active organization
- Feature-specific state (teams, lists, tasks, chat) is owned locally by feature boundaries

This constraint is intentional to reduce complexity and AI drift.

---

## Dashboard Interaction Model

Desktop:
- Card‑based layout (Teams → Lists → Tasks → Chat)
- One active card at a time

Mobile:
- Single‑view navigation
- Back/forward cycles through hierarchy

State is preserved while navigating.

---

## Mobile Strategy

- PWA is the primary application
- Capacitor wraps the PWA for iOS and Android
- Same API and auth model across platforms

---

## Development Environment

- Frontend: http://localhost:5173 (or 5174)
- Backend: http://127.0.0.1:4000
- Vite proxy routes `/api` → backend

Environment variables are documented in `ENV.md`.

---

## Testing Guarantees

- API endpoints are covered by Jest + Supertest
- Auth, RBAC, pagination, and envelopes are verified
- Frontend smoke tests validate auth persistence and navigation

---

## What This Document Is Not

- A build plan
- A product vision doc
- A decision history
- A future roadmap

Those belong in `/docs/reference/`.

