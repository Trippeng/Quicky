# ADR 0001: Prisma ORM over node-pg-migrate

Context
- Early docs referenced node-pg-migrate for migrations. We need a type-safe client, schema-first modeling, and an integrated migration workflow.

Decision
- Adopt Prisma ORM with Prisma Migrate as the single source of truth for the database schema.

Consequences
- Schema lives in `backend/prisma/schema.prisma`; migrations via `prisma migrate`.
- Typed client improves developer productivity and safety.
- Generated SQL should be reviewed before commit; deployments use `prisma migrate deploy`.

Status
- Accepted (2025-12-14)
