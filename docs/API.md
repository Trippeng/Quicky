# API Overview and Conventions

Auth
- POST /api/auth/login — email+password → access token (body) and refresh cookie (httpOnly)
- POST /api/auth/refresh — uses refresh cookie → new access token
- POST /api/auth/logout — clears refresh cookie
- POST /api/auth/otp/request, /api/auth/otp/verify — optional OTP flows

Users
- GET /api/users/me
- PATCH /api/users/me

Organizations
- POST /api/orgs — creator becomes OWNER
- GET /api/orgs, GET /api/orgs/:id
- GET /api/orgs/:id/members
- POST /api/orgs/:id/members (OWNER|ADMIN)
- PATCH /api/orgs/:id/members/:memberId (OWNER|ADMIN; cannot change OWNER role)

Invites
- POST /api/orgs/:id/invites (OWNER|ADMIN) — one-time, 14-day default expiry
- POST /api/invites/accept — accept token → creates MEMBER, marks used

Teams & Lists
- POST /api/orgs/:orgId/teams (OWNER|ADMIN)
- GET /api/orgs/:orgId/teams?limit&cursor
- POST /api/teams/:teamId/lists (OWNER|ADMIN in org)
- GET /api/teams/:teamId/lists?limit&cursor

Tasks
- POST /api/lists/:listId/tasks
- GET /api/lists/:listId/tasks?status&ownerId&limit&cursor
- GET /api/tasks/:taskId
- PATCH /api/tasks/:taskId (title, description, status, ownerId)

Messages
- POST /api/tasks/:taskId/messages
- GET /api/tasks/:taskId/messages?limit&cursor (ascending chronological)

Conventions
- Success: { status: "ok", data, meta? }
- Error: { status: "error", message, code? }
- Cursor pagination: query `limit`, `cursor`; response `meta.nextCursor` (null when done)

Security
- Access token in Authorization: Bearer <token>; refresh token in httpOnly cookie
- CORS restricted in production; secure cookies in production
