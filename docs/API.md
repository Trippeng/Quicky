# API.md

## Purpose

This document is the **living contract for the backend API**. It describes **only endpoints and behaviors that currently exist in the codebase**.

This file:
- Is authoritative for request/response shape
- Must stay aligned with the implementation
- May be extended as new endpoints are added

This file must **not** describe future, planned, or speculative APIs.

---

## General Conventions

### Base Path

All endpoints are served under:

```
/api
```

This is implicitly treated as **v1**.

---

### Authentication

- Most endpoints require authentication
- Access tokens are sent via Authorization header
- Refresh tokens are stored as httpOnly cookies

Unauthenticated requests:
- Return `401 Unauthorized`
- May return `401` before RBAC or validation errors

---

### Organization Context

- Org membership is enforced via resource paths (e.g., teams under an org, lists under a team, etc.).
- Endpoints include the required identifiers in their URL path (e.g., `/api/orgs/:orgId/teams`, `/api/teams/:teamId/lists`).
- The server validates that the authenticated user is a member of the relevant organization and, when required, has `OWNER` or `ADMIN` role.

---

### Response Envelope

All responses follow a consistent envelope:

Success:
```json
{ "status": "ok", "data": {}, "meta": {} }
```

Error:
```json
{ "status": "error", "message": "...", "errors": [] }
```

- `meta` is optional
- Validation errors include a detailed `errors` array

---

### Pagination

- Cursor-based pagination only
- Offset-based pagination is not used

Paginated responses include:
```json
meta: {
  "nextCursor": "..." | null
}
```

---

## Health

### GET /health

Purpose:
- Liveness check

Response:
```json
{ "status": "ok" }
```

---

## Authentication

### POST /api/auth/login

- Email-based login
- Supports password or OTP flows

---

### POST /api/auth/refresh

- Refreshes access token using httpOnly refresh cookie
- Called automatically by the client on `401`

---

### POST /api/auth/logout

- Invalidates refresh token

---

## Users

### GET /api/users/me

- Returns the authenticated user

---

### PATCH /api/users/me

- Updates user profile fields

---

## Organizations

### GET /api/orgs

- Lists organizations the user belongs to, including the caller's role within each org
- Returns an array of objects: `{ id: string, name: string, role: "OWNER" | "ADMIN" | "MEMBER" }`

---

### POST /api/orgs

- Creates a new organization
- Creating user becomes owner

---

## Invites

### POST /api/invites

- Creates an invite for an organization

---

### POST /api/invites/accept

- Accepts an invite
- Creates org membership

---

## Teams

### GET /api/orgs/:orgId/teams

- Lists teams for an organization the user belongs to
- Cursor-paginated
- Auth: org membership required
- Query: `limit`, `cursor`
 - Notes: returns only non-archived teams

### POST /api/orgs/:orgId/teams

- Creates a team in the organization
- Auth: `OWNER` or `ADMIN` in the org
- Body: `{ name: string (min 2) }`

### PATCH /api/teams/:teamId

- Updates a team
- Auth: `OWNER` or `ADMIN` in the owning org
- Body: `{ name?: string (min 2), archived?: boolean }`

### DELETE /api/teams/:teamId

- Deletes a team and all of its lists and tasks
- Auth: `OWNER` or `ADMIN` in the owning org

---

## Task Lists

### GET /api/teams/:teamId/lists

- Lists task lists for a team
- Cursor-paginated
- Auth: membership in the team’s org required
- Query: `limit`, `cursor`
 - Notes: returns only non-archived lists

### POST /api/teams/:teamId/lists

- Creates a task list in a team
- Auth: `OWNER` or `ADMIN` in the team’s org
- Body: `{ name: string (min 2) }`

### PATCH /api/lists/:listId

- Updates a task list
- Auth: `OWNER` or `ADMIN` in the list’s org
- Body: `{ name?: string (min 2), archived?: boolean }`

### DELETE /api/lists/:listId

- Deletes a list and all of its tasks
- Auth: `OWNER` or `ADMIN` in the list’s org

---

## Tasks

### GET /api/lists/:listId/tasks

- Lists tasks in a list
- Cursor-paginated
- Auth: membership in the list’s org required
- Query: `limit`, `cursor`, `status` (enum), `ownerId`
- Notes: returns only non-archived tasks

### POST /api/lists/:listId/tasks

- Creates a task in a list
- Auth: membership in the list’s org required
- Body: `{ title: string (min 1), description?: string, ownerId?: string }`

### GET /api/tasks/:taskId

- Returns a task by id
- Auth: membership in the task’s org required

### PATCH /api/tasks/:taskId

- Updates task fields
- Auth: membership in the task’s org required
- Body: `{ title?: string (min 1), description?: string, status?: TaskStatus, ownerId?: string | null, archived?: boolean }`

### DELETE /api/tasks/:taskId

- Deletes a task
- Auth: membership in the task’s org required

---

## Task Messages

### GET /api/tasks/:taskId/messages

- Lists messages for a task
- Ordered ascending
- Cursor-paginated
- Auth: membership in the task’s org required
- Query: `limit`, `cursor`

### POST /api/tasks/:taskId/messages

- Creates a message for a task
- Auth: membership in the task’s org required
- Body: `{ body: string (min 1) }`

---

## Invites

### POST /api/orgs/:id/invites

- Creates an invite for the organization
- Auth: `OWNER` or `ADMIN`
- Body: `{ days?: number }` (default 14, max 30)

### POST /api/invites/accept

- Accepts an invite by token, creates org membership
- Auth required
- Body: `{ token: string }`
- Not a frontend integration guide

Only implemented behavior belongs here.
