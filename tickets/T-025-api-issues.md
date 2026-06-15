---
id: T-025
title: API — Issues CRUD (status, priority, resolved-date invariant)
status: ready
priority: medium
owner: ~
dependencies: [T-020]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-025 — API: Issues

## Goal

Expose CRUD for vehicle issues scoped to an owned vehicle, with status and
priority drawn from the shared constants and the resolved-date invariant mirrored
at the API boundary, validated by the T-019 schemas and surfaced in
`/openapi.json`.

## Context

`issues` tracks a reported problem on a vehicle with `reportedDate`, optional
`resolvedDate`, `title`, `description`, a `statusId` FK
(`ISSUE_STATUS_CODES`: `open` | `in_progress` | `resolved` | `cancelled`), a
`priorityId` FK (`ISSUE_PRIORITY_CODES`: `low` | `medium` | `high`), and an
optional `relatedServiceRecordId` (set null on delete). The DB enforces
`resolvedDate IS NULL OR resolvedDate >= reportedDate`; the product rule is that
a `resolved` issue must carry a `resolvedDate`. We mirror that at the boundary so
the client gets a clean 400 instead of a constraint error.

## Acceptance criteria

- [ ] `GET /vehicles/:vehicleId/issues` lists an owned vehicle's issues, newest
      `reportedDate` first, with optional `status` / `priority` filters; single-item
      `GET`/`PATCH`/`DELETE` are ownership-scoped through the parent vehicle
      (cross-user → 404).
- [ ] `POST` creates from `IssueCreate`; `statusId`/`priorityId` resolve from
      `ISSUE_STATUS_CODES` / `ISSUE_PRIORITY_CODES`, and an unknown code is a clean
      400, not an FK 500.
- [ ] Resolved-date invariant enforced at the boundary: setting status to
      `resolved` requires a `resolvedDate`; a non-resolved status must clear it;
      and `resolvedDate >= reportedDate` (matching the DB check).
- [ ] `relatedServiceRecordId`, when provided, must reference a service record on
      the same vehicle; an invalid reference is a clean 400/404.
- [ ] Routes registered via `zodRoute()` and present in `/openapi.json`.
- [ ] Vitest covers the resolved-without-date rejection, the resolved-before-
      reported rejection, a status/priority filter, and a cross-user 404.

## Files to touch

- `apps/api/src/issues/` (module, routes, service)
- `apps/api/src/issues/*.test.ts`

## Out of scope

- Auto-creating a service record from an issue, or any workflow automation
  beyond the optional `relatedServiceRecordId` link.
- Reminders generated from open issues — reminders are T-027.
- Issue analytics / open-count widgets — that is T-028.

## Implementation notes

- Express the resolved-date rule as a Zod `refine`/`superRefine` on the
  create/update schema so the same check runs on both apps; keep the DB check as
  the backstop, not the primary error path.
- Resolve `statusId`/`priorityId` through the same lookup helper used for the
  other code→id FK fields (T-020/T-023) so mapping stays in one place.
- `description`, `resolvedDate`, and `relatedServiceRecordId` are nullable — allow
  omitting them on create.

## References

- Related tickets: T-020 (vehicles), T-024 (service records linked via
  `relatedServiceRecordId`), T-027 (reminders), T-028 (analytics)
- Schema: `packages/db/src/schema/issues.ts`; constants:
  `packages/shared/src/constants/issue-statuses.ts`,
  `packages/shared/src/constants/issue-priorities.ts`
