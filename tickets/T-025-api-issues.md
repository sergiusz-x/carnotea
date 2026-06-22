---
id: T-025
title: API — Issues CRUD (status, priority, resolved-date invariant)
status: done
priority: medium
size: M
spec_version: 1
owner: claude-code
dependencies: [T-020]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: 2026-06-21
---

# T-025 — API: Issues

## Goal

Expose CRUD for vehicle issues scoped to an owned vehicle, with status and
priority drawn from the shared constants and the resolved-date invariant mirrored
at the API boundary, surfaced in `/openapi.json`.

## Context

`issues` tracks a reported problem with `reportedDate`, optional `resolvedDate`,
`title`, `description`, a `statusId` FK
(`ISSUE_STATUS_CODES`: `open` | `in_progress` | `resolved` | `cancelled`), a
`priorityId` FK (`ISSUE_PRIORITY_CODES`: `low` | `medium` | `high`), and an
optional `relatedServiceRecordId` (set null on delete). The DB enforces
`resolvedDate IS NULL OR resolvedDate >= reportedDate`; the product rule is that a
`resolved` issue must carry a `resolvedDate`. We mirror both at the boundary so the
client gets a clean 400 instead of a constraint error.

Follows [`patterns/resource-crud-api.md`](../docs/agents/patterns/resource-crud-api.md).

## Contract

### Endpoints

| Method | Path                                    | Auth    | Success       | Errors                                   |
| ------ | --------------------------------------- | ------- | ------------- | ---------------------------------------- |
| GET    | `/api/vehicles/{vehicleId}/issues`      | session | 200 `Issue[]` | 401, 404 NOT_FOUND                       |
| POST   | `/api/vehicles/{vehicleId}/issues`      | session | 201 `Issue`   | 400 VALIDATION_ERROR, 401, 404 NOT_FOUND |
| GET    | `/api/vehicles/{vehicleId}/issues/{id}` | session | 200 `Issue`   | 401, 404 NOT_FOUND                       |
| PATCH  | `/api/vehicles/{vehicleId}/issues/{id}` | session | 200 `Issue`   | 400, 401, 404 NOT_FOUND                  |
| DELETE | `/api/vehicles/{vehicleId}/issues/{id}` | session | 204           | 401, 404 NOT_FOUND                       |

List newest-first on `reportedDate`. GET list supports `?status=` and
`?priority=` query filters (validated by a Zod query schema).

### Request / response shapes

- `IssueSchema`, `IssueCreateSchema`, `IssueUpdateSchema` in `@carnotea/shared`
  (`issue.ts`, exists). `status`/`priority` are codes; resolved to ids on write.
- The resolved-date rule is a `superRefine` on create/update: `status='resolved'`
  ⇒ `resolvedDate` required; any other status ⇒ `resolvedDate` must be null; and
  `resolvedDate >= reportedDate`.

### Provides

- _n/a_ (leaf resource; nothing else consumes it as a seam).

### Consumes

- Vehicle ownership (T-020); lookup resolver shape (T-020). Optional
  `relatedServiceRecordId` must reference a record on the same vehicle (T-024).

## Acceptance criteria

- [ ] List + single-item `GET`/`PATCH`/`DELETE` ownership-scoped through the
      parent vehicle (cross-user → 404), with optional `status`/`priority` filters.
- [ ] `POST` creates from `IssueCreate`; `status`/`priority` resolve from the code
      constants, and an unknown code is a clean 400, not an FK 500.
- [ ] Resolved-date invariant enforced at the boundary: `resolved` requires a
      `resolvedDate`; a non-resolved status clears it; `resolvedDate >= reportedDate`.
- [ ] `relatedServiceRecordId`, when provided, must reference a service record on
      the same vehicle; an invalid reference is a clean 400/404.
- [ ] Routes registered via `zodRoute()` and present in `/openapi.json`.

## Test matrix

Inherits the baseline matrix, plus:

| Case                         | Input                                       | Expected             |
| ---------------------------- | ------------------------------------------- | -------------------- |
| resolved without date        | `status=resolved`, no `resolvedDate`        | 400 VALIDATION_ERROR |
| resolved before reported     | `resolvedDate < reportedDate`               | 400 VALIDATION_ERROR |
| non-resolved keeps date null | `status=open`, `resolvedDate` set           | 400 VALIDATION_ERROR |
| unknown status/priority code | `status="nope"`                             | 400 VALIDATION_ERROR |
| related record other vehicle | `relatedServiceRecordId` of another vehicle | 400/404              |
| status filter                | `?status=open`                              | only open issues     |
| cross-user isolation         | another user's `vehicleId`                  | 404 NOT_FOUND        |

## Files to touch

- `apps/api/src/issues/` (module, controller, service)
- `apps/api/src/issues/*.test.ts`

## Out of scope

- Auto-creating a service record from an issue, or any workflow automation beyond
  the optional `relatedServiceRecordId` link.
- Reminders generated from open issues — reminders are T-027.
- Issue analytics / open-count widgets — that is T-028.

## Implementation notes

- Express the resolved-date rule as a Zod `superRefine` on the create/update
  schema so the same check runs on both apps; keep the DB check as the backstop.
- Resolve `statusId`/`priorityId` through the same lookup helper used for the other
  code→id FK fields (T-020/T-023) so mapping stays in one place.
- `description`, `resolvedDate`, and `relatedServiceRecordId` are nullable — allow
  omitting them on create.

## Verification

- `pnpm --filter @carnotea/api test issues` → all pass
- `curl -s localhost:3001/openapi.json | jq '.paths | keys[] | select(contains("issues"))'` → all 5 routes present

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Related tickets: T-020, T-024 (service records), T-027 (reminders), T-028
- Schema: `packages/db/src/schema/issues.ts`; constants:
  `packages/shared/src/constants/issue-statuses.ts`, `issue-priorities.ts`;
  `packages/shared/src/schemas/issue.ts`
