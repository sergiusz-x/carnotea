---
id: T-037
title: Web issue screens with priority, status, and resolved date
status: done
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-033, T-025]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-23
closed_at: ~
---

# T-037 — Web issue screens with priority, status, and resolved date

## Goal

Let a user track vehicle issues — view, add, edit, resolve, and delete — with
priority and status surfaced and resolved-date handling, driven by TanStack Query
against the typed client.

## Context

Issues are the "something's wrong" log: reported problems with a priority, a lifecycle
status, an optional resolved date, and an optional link to the service record that
fixed them. They hang off the vehicle hub (T-033) and consume the API from T-025.

Follows [`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).

## Contract

### Routes

| Route                                  | Screen      | Data                                    |
| -------------------------------------- | ----------- | --------------------------------------- |
| `/vehicles/$vehicleId/issues`          | list        | `issuesQueryOptions(vehicleId, filter)` |
| `/vehicles/$vehicleId/issues/new`      | create form | —                                       |
| `/vehicles/$vehicleId/issues/$id`      | detail      | `issueQueryOptions(vehicleId, id)`      |
| `/vehicles/$vehicleId/issues/$id/edit` | edit form   | same                                    |

### Query keys

```
['vehicles', vehicleId, 'issues', { status?, priority? }]   # filtered list
['vehicles', vehicleId, 'issues', id]                       # one issue
```

### Request / response shapes

- `IssueSchema`, `IssueCreateSchema`, `IssueUpdateSchema` from `@carnotea/shared`.
  Form fields: `reportedDate`, `resolvedDate`, `title`, `description`, **`status`
  (code, from `ISSUE_STATUS_CODES`)**, **`priority` (code, from
  `ISSUE_PRIORITY_CODES`)**, `relatedServiceRecordId`. Use the codes, not `statusId`/
  `priorityId`.

### Provides

- _n/a_

### Consumes

- `apiClient` write methods (T-033 seam), vehicle-scoped layout (T-033), forms
  (T-031), issues API (T-025), the vehicle's service-records query (T-036) to
  populate the `relatedServiceRecordId` select.

## Acceptance criteria

- [ ] List shows issues (title, priority, status, reported date, resolved date) with
      loading/empty/error and a status filter.
- [ ] Priority and status render as translated badges; options derive from the code
      constants.
- [ ] Detail shows the full issue, including description and the linked service record
      when present.
- [ ] Create/edit use the T-031 form stack with the shared schema.
- [ ] Resolved-date handling: `status=resolved` requires a `resolvedDate`; the UI
      enforces `resolvedDate >= reportedDate` and clears the date when status moves
      back to non-resolved; the server check error surfaces.
- [ ] Delete asks for confirmation.
- [ ] All reads/writes via TanStack Query + typed client; mutations invalidate the
      issue list and detail.
- [ ] Every string in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, filter, create, resolve, delete); fallback noted.

## Test matrix

Inherits the screens baseline, plus:

| Case                          | Expected                                            |
| ----------------------------- | --------------------------------------------------- |
| status/priority badges        | translated labels from the code constants           |
| resolve requires date         | choosing `resolved` reveals/requires `resolvedDate` |
| resolved-date order check     | `resolvedDate < reportedDate` shows a field error   |
| status moves back clears date | switching to `open` clears `resolvedDate`           |
| related-record select         | lists the vehicle's service records                 |
| status filter                 | filtering by status narrows the list                |

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/issues/**`
- `apps/web/src/features/issues/**`
- `apps/web/src/locales/{pl,en}/issues.json`

## Out of scope

- API work for issues (T-025) — typed client consumed as-is.
- Creating service records from an issue (link to an existing one only; T-036 owns
  service authoring).

## Implementation notes

- Tie `resolvedDate` visibility/requirement to the selected status so resolving is a
  single coherent step; clear it if status moves back to open/in-progress.
- The `relatedServiceRecordId` select lists the vehicle's service records (from the
  T-036 area's query).

## Verification

- `pnpm --filter @carnotea/web test issues` → all pass
- `pnpm --filter @carnotea/web dev` → agent-browser exercises list/filter/create/resolve/delete
- `pnpm --filter @carnotea/web typecheck` → 0 errors

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-033, T-025, T-031, T-011, T-036 (service records)
