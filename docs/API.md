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

### Organization Context (Required)

All org-scoped endpoints require an explicit organization identifier:

```
X-Org-Id: <organization-id>
```

Rules:
- Backend verifies membership on every request
- Missing org context results in request rejection

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

- Lists organizations the user belongs to

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

### GET /api/teams

- Lists teams for the active organization
- Cursor-paginated

---

### POST /api/teams

- Creates a team in the organization

---

## Task Lists

### GET /api/lists

- Lists task lists for a team
- Cursor-paginated

---

### POST /api/lists

- Creates a task list

---

## Tasks

### GET /api/tasks

- Lists tasks
- Supports filters
- Cursor-paginated

---

### POST /api/tasks

- Creates a task

---

### PATCH /api/tasks/:id

- Updates task fields (status, owner, due date, watchers, etc.)

---

## Task Messages

### GET /api/messages

- Lists messages for a task
- Ordered ascending
- Cursor-paginated

---

### POST /api/messages

- Creates a task message

---

## Notes

- RBAC failures return `403`
- Validation failures return `400`
- Some unauthenticated requests may return `401` before other checks

---

## What This Document Is Not

- Not a roadmap
- Not a schema reference
- Not a frontend integration guide

Only implemented behavior belongs here.
