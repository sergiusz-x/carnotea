---
id: T-030
title: Audit-logging interceptor for mutating actions
status: done
priority: low
size: M
spec_version: 1
owner: Antigravity
dependencies: [T-004, T-006]
labels: [api, security]
created_at: 2026-06-15
updated_at: 2026-07-21
closed_at: ~
---

# T-030 — API: Audit logging interceptor

## Goal

Add a cross-cutting NestJS interceptor that records every successful mutating
action (create/update/delete) into the `audit_logs` table — who acted, on what
record, when, and the before/after state — without per-endpoint boilerplate.

## Context

The `audit_logs` table already exists: `tableName`, `recordId` (uuid), `operation`
(`INSERT | UPDATE | DELETE`, per `audit_logs_operation_chk`), `oldData`/`newData`
(`jsonb`), `createdAt`. Nothing writes to it yet. As feature endpoints land, we
want a tamper-evident trail captured once at the framework seam rather than
scattered through every service. Rides on the API skeleton (T-004) and the auth
session context (T-006) for the actor id.

Cross-cutting, not a resource — does not follow the CRUD pattern.

## Contract

### Seam

- `@Audited(tableName: string)` — a method/controller decorator that opts a
  mutating route into auditing and declares the affected domain table.
- `AuditInterceptor` — registered globally; acts only on routes carrying
  `@Audited`, and only on 2xx responses.

### Verb → operation mapping

| HTTP verb   | `operation` | Snapshot captured     |
| ----------- | ----------- | --------------------- |
| POST        | `INSERT`    | `newData`             |
| PATCH / PUT | `UPDATE`    | `oldData` + `newData` |
| DELETE      | `DELETE`    | `oldData`             |
| GET / HEAD  | (none)      | nothing written       |

### Provides

- The `@Audited` decorator, applied by the feature tickets to their mutating
  routes. (Those tickets are already done/spec'd; applying the decorator to them is
  a follow-up noted here, not part of this ticket's scope.)

### Consumes

- The better-auth session/guard (T-006) for the actor id.
- Pino logger (T-004) for the failure path.

## Acceptance criteria

- [ ] The interceptor writes one `audit_logs` row per successful mutating request,
      mapping the verb per the table above; `GET`/`HEAD` write nothing.
- [ ] Each row records `tableName`, `recordId` (the affected row's uuid), and
      `createdAt`; the operation always satisfies `audit_logs_operation_chk`.
- [ ] The acting user's id is captured from the session context; if the audit
      schema lacks an actor column, that is raised as an Ask-First schema change,
      not silently dropped.
- [ ] `oldData`/`newData` capture the right before/after snapshot per verb; secrets
      and tokens are never written into the jsonb payload.
- [ ] A failed audit insert is logged (pino) but does **not** roll back or fail the
      user's successful mutation.
- [ ] Failed/4xx/5xx requests produce no audit row (only committed mutations).
- [ ] The interceptor is opt-in per route/controller via `@Audited('table')` so
      non-domain routes (`/healthz`, auth) are excluded.

## Test matrix

| Case                      | Input                         | Expected                               |
| ------------------------- | ----------------------------- | -------------------------------------- |
| create writes INSERT row  | `POST` on an `@Audited` route | one row, `operation=INSERT`, `newData` |
| update writes UPDATE row  | `PATCH`                       | `operation=UPDATE`, old+new            |
| delete writes DELETE row  | `DELETE`                      | `operation=DELETE`, `oldData`          |
| read writes nothing       | `GET`                         | no audit row                           |
| 4xx writes nothing        | failed mutation               | no audit row                           |
| non-audited route ignored | `POST /healthz`-like          | no audit row                           |
| audit insert failure      | audit insert throws           | request still succeeds, error logged   |
| no secrets in payload     | body with a token field       | token absent from jsonb                |

## Files to touch

- `apps/api/src/audit/audit.interceptor.ts`
- `apps/api/src/audit/audit.service.ts` (Drizzle insert into `audit_logs`)
- `apps/api/src/audit/audited.decorator.ts`
- `apps/api/src/app.module.ts` (register interceptor)
- `apps/api/src/audit/*.test.ts`

## Out of scope

- A UI / endpoint to browse audit logs (separate ticket).
- Retention / archival / pruning policy.
- Auditing reads or auth flows.
- Applying `@Audited` across every existing feature controller (follow-up).
- Diffing/redaction beyond excluding obvious secret fields.

## Implementation notes

- An interceptor runs around the handler, so capture `newData` from the response
  body and `recordId` from the response or route param; for deletes the handler
  must surface the deleted row (or its id) for `oldData`.
- Prefer the decorator to declare `tableName` per controller rather than guessing
  from the route, so renames don't silently mislabel rows.
- Resolve the actor id from the same guard the feature tickets use; never trust an
  id from the body.

## Verification

- `pnpm --filter @carnotea/api test audit` → all pass
- Manual: `POST` an `@Audited` route, then `SELECT * FROM audit_logs` shows one row;
  a `GET` shows none.

## References

- Schema: `packages/db/src/schema/audit-logs.ts`
- Related tickets: T-004 (api skeleton + pino), T-006 (auth/session context)
- ADR: [ADR-0004](../docs/adr/0004-better-auth.md)
