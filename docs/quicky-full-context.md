# quicky – Full Context and Decisions Document
Decision override: Prisma ORM replaces node-pg-migrate for schema and migrations. Prisma is the source of truth; see [docs/adr/0001-prisma-over-node-pg-migrate.md](adr/0001-prisma-over-node-pg-migrate.md).

Purpose of This Document

This document is intended to serve as a complete context handoff and grounding prompt for future conversations. It captures the full product vision, technical decisions, architectural reasoning, onboarding flows, scalability assumptions, development setup, and current execution state of the quicky project. Nothing in this document should be interpreted as hypothetical; it reflects explicit decisions made so far and incorporates clarifications and refinements from ongoing implementation work.

## 1. Product Vision and Positioning

The product is a lightweight operations management web and mobile app designed for:
- Small operations teams
- Maintenance teams
- Light industrial or facilities-oriented environments

The product deliberately targets teams that find tools like MaintainX too complex, too slow to onboard, or too feature-heavy for their real-world needs.

### Core Philosophy
- Extremely low-friction onboarding
- Clear task ownership and status visibility
- Simple collaboration around work
- Fast to learn, fast to use

This is not an enterprise CMMS clone and does not attempt to compete on advanced reporting, compliance tooling, or deep asset management.

## 2. Competitive Context

### MaintainX
- Successful, well-funded CMMS
- Strong in asset-heavy, regulated environments
- High complexity and onboarding cost

### Opportunity Identified
Smaller ops teams want:
- Fewer features
- Faster setup
- Clear communication
- Mobile-first usage

The MVP is intentionally scoped to capture this underserved segment.

## 3. Core Data Model and Hierarchy

### Entities
- User
  - Identified by email
  - Default username is automatically derived from the portion of the email before the "@" on signup
  - Can belong to one or more organizations
  - Stores authentication data, including OTP values and OTP expiration timestamps for email-based login
- Organization
  - Represents a company or operational group
  - Contains users, teams, and all operational data
  - Has an owner (the user who created the organization)
- Team
  - Subdivision within an organization
- Task List
  - Belongs to a team
  - Logical grouping of tasks
- Task
  - Belongs to a task list
  - Has an owner
  - Has a status
- Task Message (Chat)
  - Belongs to a task
  - Used for discussion and updates

### Task Status Values
- Requires Attention
- At Risk
- In Progress
- Complete

Each status change can later generate a system message in the task chat.

## 4. Onboarding and Activation Flow

### Authentication
- Email-based signup
- User chooses either:
  - Password authentication, or
  - Email OTP authentication
- No social login for MVP

### OTP Implementation Details
- OTP value is stored on the user record
- OTP has a valid-until timestamp
- OTP is invalidated after use or expiration

### Session Persistence
- Once authenticated, the user session persists across page refreshes
- Refreshing the page must not return the user to the login screen if a valid session exists
- Session handling is implemented via JWT or equivalent token-based auth stored client-side

### First-Time User Flow
- User signs up or logs in
- Immediately shown the Organization Selection Page (this page already exists and is being extended, not replaced)
- This page presents two primary actions:
  - Create an organization
  - Get invited to an organization

### Invite-Aware Behavior
- If the user has a pending invite:
  - The invited organization name appears at the top of the screen
  - The two primary buttons are still shown

### Organization Selection Rules
- If a user creates an organization on this screen:
  - The organization is created in the database immediately
  - The creating user is set as the organization owner
  - The organization appears as a selectable button on the org page
  - Clicking the organization navigates the user to the dashboard page
- If the user joins via invite:
  - Membership is created in the database
  - User is routed to the dashboard
- Once a user selects an organization, this screen should not appear again
- The screen can be accessed later only via an explicit org-switching menu

### Activation Definition (Success Criteria)
An organization is considered successfully activated if:
- It reaches at least 3 users, and
- The number of tasks created in the first week is greater than or equal to the number of users in the organization

Note: Activation measurement/endpoint is deferred from the MVP. This definition remains the product KPI for later analysis and is not implemented as an API in the MVP scope.

## 5. Invite System Design

### Invite Entry Points
- On the Org Selection Page, users who do not create an org can choose "Get invited"
- Clicking "Get invited" shows an explanation screen stating:
  - An organization admin can share an invite link, or
  - An organization admin can invite the user’s email address directly inside the app

### Invite Links
- Generated by organization members
- Can be shared via text or email

### Invite Behavior
- One-time use
- Time-limited (recommended default: 14 days)
- On acceptance:
  - User becomes a member of the organization
  - Invite is invalidated

This approach balances usability with security and avoids long-lived access tokens.

## 6. MVP Feature Scope

### Included in MVP
- Authentication
- Organization creation and membership
- Team creation
- Task lists
- Tasks with status
- Task chat (text only)
- Invite flow (link-based and email-based)
  
Deferred from MVP
- Activation metrics (computation and API)

### Explicitly Excluded from MVP
- AI features
- Recurring tasks
- File uploads
- Asset tracking
- Advanced analytics
- Offline-first guarantees
- Complex role-based permissions

## 7. Core Application UI Structure

### Dashboard Page (Card Layout)
On desktop/tablet, the dashboard presents four cards:
- Teams
- Task Lists
- Tasks
- Task Chat

Card Behavior
- The active card is centered, larger, and visually in front.
- Inactive cards sit to the sides, smaller and slightly blurred to imply de-emphasis.
- Clicking an inactive card makes it active and focuses its content.
- The selected team determines visible lists; selected list determines tasks; selected task determines chat messages.
 - Pagination: Next uses cursor from backend responses; Prev leverages in-memory page caches for each card to enable quick back navigation without refetching.

### Mobile Behavior
- Single card/view visible at a time.
- Back/forward navigation cycles through Teams → Lists → Tasks → Chat.
- State is preserved while navigating.

### Phase 2 Additions
- Auth/session: Short-lived access JWT and longer-lived refresh via httpOnly cookies; auto-refresh and single retry on 401.
- Polling:
  - Chat polls on load and every 5s while active; pauses when inactive.
  - Teams/Lists/Tasks poll on load and every 30s while active; pause/resume by visibility.
- Login/Signup combined screen:
  - Header starts as "Log in or Sign up"; after email entry, switch to "Log in" (existing email) or "Sign up" (new email), revealing password and OTP options.
- Chat UX:
  - Familiar chat bubbles with author/timestamp; input with send; placeholder buttons for voice notes and attachments (non-functional in Phase 2).
- Mobile-first & desktop:
  - Fine-tuned mobile spacing and touch targets; desktop retains multi-column usefulness with expanded context.

## 8. Monetization Direction

While not implemented yet, the intended monetization model is:
- SaaS pricing per organization
- Free tier with strict limits (users or tasks)
- Paid tiers unlock:
  - More users
  - More tasks
  - Notifications
  - Integrations

Pricing is aligned with operational value, not enterprise procurement complexity.

## 9. Technical Architecture Overview

### Frontend
- React + TypeScript
- Built with Vite (not Create React App)
- Rolldown-vite explicitly declined due to experimental status
- Frontend runs at http://localhost:5173
- Uses a Vite dev-server proxy for backend API access

### Backend
- Node.js + Express
- Stateless API design
- JWT-based authentication

Reasons:
- Same language across stack
- Simple and flexible
- Non-blocking I/O suits chat-style workloads

NestJS was considered but deferred to reduce MVP complexity.

### Database
- PostgreSQL
- All schema definitions and changes are managed in code using migrations
- Tables are not manually created in pgAdmin in the long term
- Migrations are the source of truth for schema state

Reasons:
- Strong relational modeling
- Clear hierarchy enforcement
- Proven scalability
- Supports JSON fields if needed

### Mobile Strategy
- PWA-first
- Wrapped using Capacitor for iOS and Android

Reasons:
- Single codebase
- Near-native experience
- App store distribution without native rewrite

## 10. Scalability Assumptions and Validation

Target scale discussed:
- ~3,000 organizations
- ~3 million tasks
- ~60 million task messages

### Validation
This scale is well within limits for:
- Postgres with indexing and pagination
- Node.js with stateless services
- React with virtualized lists

### Required Practices
- Mandatory pagination
- Indexed foreign keys
- Lazy loading messages
- Optional partitioning for large tables
- Stateless backend services

No architectural rewrites are required to reach this scale.

## 11. Local Development Environment

### Tools Installed
- Node.js (LTS)
- npm
- Git
- PostgreSQL (local or Docker)
- VS Code

### Project Structure (current)
```
quicky/
├─ backend/
└─ docs/
```

### Frontend Setup
- Vite + React + TypeScript
 - Browser smoke via Playwright configured (baseURL via `BASE_URL`), validating login, session refresh-on-401, and dashboard navigation.

### Backend Setup
- Express + TypeScript server scaffolded
- Environment variables via `.env` (see [docs/ENV.md](ENV.md))
- PostgreSQL + Prisma ORM with Prisma Migrate
- Health check at `/health`; bind `HOST=127.0.0.1` on Windows
 - Hardening: request-id logging (`pino-http`), consistent error envelopes via helpers, CORS restricted to dev origins (127.0.0.1:5173/5174), rate limiting on `/api/auth/*`, and `zod` validation across auth login, team/list/task/message create and task patch routes.
 - Pagination Meta: Cursor pagination responses include `meta.nextCursor` across Teams, Lists, Tasks, and Messages; API tests assert presence with `limit=1`.
 - E2E Coverage: API sanity suite (auth/session, org listing, RBAC denies, CRUD envelopes, hardening headers) and a frontend Playwright smoke test both passing; evidence logged in `docs/build-plan.md`.

## 12. AI-Assisted Development Strategy

AI is used as:
- A senior pair programmer
- A boilerplate generator
- A refactoring assistant

### Guidelines
- Small, scoped prompts
- No monolithic generation requests
- Focus on components, APIs, schemas, and fixes

### Example Implemented Prompt
A detailed Copilot prompt was created to generate the Organization Selection Page, defining:
- UI states
- Local state management
- Placeholder async functions
- No routing
- No backend coupling

## 13. Current Execution State

### Completed (Backend MVP scope)
- Backend foundation (Express + TS) with `/health`
- Env validation and typed config
- Prisma setup, schema models, migrations
- Auth helpers and routes (login, refresh, logout; OTP scaffolding)
- Users endpoints (me get/patch)
- Organizations + RBAC (owner/admin/member)
- Invites (create, accept)
- Teams and Lists (with cursor pagination)
- Tasks CRUD + status (filters + cursor pagination)
- Task messages (ascending chronological with cursor pagination)
- Troubleshooting documented for Windows HOST binding
 - Tests: Jest + Supertest suites added (`backend/tests/*`); unauthenticated routes may return `401` and tests accept `401` alongside `400/403/404` for validation and permission scenarios.

### Next Logical Steps
- Frontend: UI framework decision, Vite scaffold, API client + proxy, auth UI/session, org selection, dashboard
- Hardening: logging, CORS, rate limiting, validation, seeds, E2E pass
- Activation metrics: deferred (KPI only), no API in MVP

## 13. Usage Instruction for Future Conversations

This document should be treated as authoritative context. All recommendations, code, and decisions should align with what is defined here unless explicitly overridden.

---

## Builder’s Notes (Working Index)

- Source: User-provided, authoritative quicky context. Keep this file up to date with any explicit changes made in future sessions.
- Working anchors:
  - Data model: Section 3
  - Auth + OTP: Section 4
  - Invite system: Section 5
  - MVP scope: Section 6
  - Dashboard UX: Section 7
  - Tech stack: Section 9
  - Dev setup: Section 11
  - Execution state + next steps: Section 13
- Implementation priority (initial):
  1) Org Selection logic + invites
  2) Auth persistence
  3) Org/invite APIs + proxy
  4) Dashboard columns layout
