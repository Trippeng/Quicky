# AI Contributors Guideline (Must Read)

This repository uses AI assistance. To maintain reliability and traceability, every AI (and human) contributor must follow these rules:

1) Always update the progress ledger
- File: [docs/build-plan.md](build-plan.md)
- On any meaningful change: update step status, timestamp, evidence (commit/PR links, file paths), and next action.
- Do not merge or complete a task without reflecting it in this document.

2) Keep authoritative docs aligned
- Update [docs/architecture.md](architecture.md) and [docs/quicky-full-context.md](quicky-full-context.md) when architectural decisions or scope change.
- Note any intentional deviations (e.g., migration tooling) at the top of the file with rationale.

3) Use acceptance criteria and verification gates
- Each step in [build-plan.md](build-plan.md) defines clear acceptance.
- Provide evidence (commands, responses, screenshots/logs descriptions) so another contributor could verify independently.

4) Be explicit about blockers
- If blocked, set status to `blocked`, describe the issue, proposed mitigation, and owner.

5) Keep changes minimal and scoped
- Respect existing structure and style. Avoid drive-by unrelated refactors.

6) Security and privacy
- Never expose secrets. Use `.env` and sample values in `.env.example`.
- For auth, never surface refresh tokens to frontend code; use httpOnly cookies.

7) Communication conventions
- When running multi-step work, maintain a concise plan and progress notes in PR descriptions.
- Reference step numbers from [build-plan.md](build-plan.md) in commit messages, e.g., "Step 5: Implement JWT helpers".

Failure to follow these rules creates inconsistency and slows the team. Keep the plan and docs as the single source of truth.
