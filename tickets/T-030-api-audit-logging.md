---
id: T-030
title: Audit-logging interceptor for mutating actions
status: ready
priority: low
owner: ~
dependencies: [T-004]
labels: [api, security]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-030 — API: Audit logging interceptor

## Goal

Add a cross-cutting NestJS interceptor that records every successful mutating
action (create/update/delete) into the `audit_logs` table — who acted, on what
record, when, and the before/after state — without per-endpoint boilerplate.

## Context

The `audit_logs` table already exists: `tableName`, `recordId` (uuid),
`operation` (`INSERT | UPDATE | DELETE`, per `audit_logs_operation_chk`),
`oldData`/`newData` (`jsonb`), and `createdAt`. Nothing writes to it yet. As
feature endpoints (vehicles, fuel, charging, service, expenses, reminders) land,
we want a tamper-evident trail of changes for support and security — captured
once at the framework seam rather than scattered through every service. This
rides on the API skeleton (T-004) and applies to the mutating routes the feature
tickets add.

## Acceptance criteria

- [ ] A NestJS interceptor writes one `audit_logs` row per successful mutating
      request, mapping the HTTP verb to the operation (`POST`→`INSERT`,
      `PATCH`/`PUT`→`UPDATE`, `DELETE`→`DELETE`); `GET`/`HEAD` write nothing.
- [ ] Each row records `tableName` (the affected domain table), `recordId` (the
      affected row's uuid), and `createdAt`; the operation always satisfies
      `audit_logs_operation_chk`.
- [ ] The acting user's id is captured (from the better-auth session context) so
      "who" is answerable; if the audit schema lacks an actor column, recording it
      is raised as an Ask-First schema change rather than silently dropped.
- [ ] `oldData` / `newData` capture the relevant before/after snapshot: `newData`
      on create, `oldData` on delete, both on update; secrets/tokens are never
      written into the jsonb payload.
- [ ] Audit writes never break the request: a failed audit insert is logged (pino)
      but does not roll back or fail the user's successful mutation.
- [ ] Failed/4xx/5xx requests do **not** produce an audit row (only committed
      mutations are recorded).
- [ ] The interceptor is opt-in per route/controller via a small decorator (e.g.
      `@Audited('vehicles')`) so non-domain routes (`/healthz`, auth) are excluded.
- [ ] Vitest covers: a create/update/delete each writing the right row, a read
      writing nothing, and an audit-insert failure not failing the request.

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
- Diffing/redaction beyond excluding obvious secret fields.

## Implementation notes

- An interceptor runs around the handler, so capture `newData` from the response
  body and `recordId` from the response or route param; for deletes the handler
  must surface the deleted row (or its id) for `oldData`.
- Prefer the decorator to declare `tableName` per controller rather than guessing
  it from the route, so renames don't silently mislabel rows.
- Resolve the actor id from the same session/guard mechanism the feature tickets
  use; never trust an id from the request body.

## References

- Schema: `packages/db/src/schema/audit-logs.ts`
- Related tickets: T-004 (api skeleton + pino), T-006 (auth/session context)
- ADR: [ADR-0004](../docs/adr/0004-better-auth.md)
