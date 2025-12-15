# AI_CONTROL.md

## Purpose

This document defines **how AI tools (Copilot, ChatGPT, etc.) must behave** when working in this repository. It establishes authority, priority, and non‑negotiable constraints. If any ambiguity or conflict exists, this file is the final arbiter.

This file intentionally contains **no implementation detail**.

---

## Absolute Authority

If there is any conflict between documents, instructions, or assumptions, the following priority order applies:

1. **AI_CONTROL.md** (this file)
2. **ARCHITECTURE.md** (current system truth)
3. **The codebase itself** (actual implementation)
4. **Reference documents** (`/docs/reference/*`)
5. **AI inference or best practices**

AI must never override a higher‑priority source using a lower‑priority one.

---

## Active Documentation Set (Locked)

Only the following documents are considered **active and authoritative** for AI-assisted work:

- `AI_CONTROL.md`
- `ARCHITECTURE.md`
- `API.md`
- `DEV.md`
- `TESTING.md`

AI must ignore all other documents by default unless explicitly instructed to consult them.

---


## Required Reading Rules

Before performing any task, AI must:

1. Read **AI_CONTROL.md** in full
2. Determine whether the task affects:
   - Architecture
   - Auth/session behavior
   - Org scoping or RBAC
   - Data model or persistence
3. If yes, consult **ARCHITECTURE.md** before acting
4. Ignore all reference documents unless explicitly instructed to consult them

Failure to follow these steps is considered incorrect behavior.

---

## Change Discipline

AI must follow these constraints strictly:

- Do **not** refactor, reformat, rename, or reorganize code unless explicitly asked
- Do **not** introduce new abstractions, libraries, or patterns without approval
- Do **not** "improve" architecture, security, or performance unless requested
- Do **not** change behavior to align with best practices if it contradicts existing decisions

The goal is **correctness and alignment**, not optimization or elegance.

---

## Scope Control

Each task is assumed to be **narrowly scoped**.

AI must:
- Modify only files directly required for the task
- Avoid cascading changes
- Avoid speculative fixes
- Avoid preemptive cleanup

If a task appears to require broader changes, AI must **pause and ask for confirmation**.

---

## Architecture Stability Rules

The following are treated as **locked unless explicitly changed**:

- Stateless backend API
- Org‑scoped access control (no global user data leakage)
- Cursor‑based pagination contracts
- JWT‑based auth with refresh flow
- Prisma as the database source of truth
- PWA‑first frontend wrapped via Capacitor

AI must not propose alternatives unless explicitly asked to re‑evaluate.

---

## Ambiguity Handling

If requirements are unclear or conflicting, AI must:

1. State what is unclear
2. Identify which authority is missing or ambiguous
3. Ask a clarifying question
4. Wait for instruction

AI must **never guess** in areas that affect auth, data integrity, or architecture.

---

## Reference Documents Policy

Documents in `/docs/reference/`:

- Are historical or informational
- May be incomplete or outdated
- Are never authoritative

They may be used **only** to provide background context when explicitly requested.

---

## Output Expectations

Unless instructed otherwise, AI output should:

- Be concise and task‑focused
- Avoid repeating known context
- Avoid re‑explaining architecture
- Avoid speculative commentary

When coding, AI should prefer **small, reviewable diffs**.

---

## Verification Check (Required)

For non‑trivial tasks, AI should first respond with:

> "Constraints acknowledged. Based on AI_CONTROL.md and ARCHITECTURE.md, I will:"

Followed by a short bullet list of constraints it will obey.

Only after confirmation should implementation begin.

---

## Controlled Document Updates

Authoritative documents may only be updated when:

1. The underlying code or behavior has already changed
2. The update is explicitly requested
3. The change reflects current state only, not future intent

AI must never update authoritative documents as a side effect of implementation.

---

## Final Rule

When in doubt:

**Stop. Ask. Do not invent.**

