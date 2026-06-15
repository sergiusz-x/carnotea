---
id: T-037
title: Web issue screens with priority, status, and resolved date
status: ready
owner: ~
priority: medium
dependencies: [T-033, T-025]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-037 — Web issue screens with priority, status, and resolved date

## Goal

Let a user track vehicle issues — view, add, edit, resolve, and delete — with
priority and status surfaced and resolved-date handling, driven by TanStack
Query against the typed client.

## Context

Issues are the "something's wrong" log: reported problems with a priority, a
lifecycle status, and an optional resolved date and link to the service record
that fixed them. They hang off the vehicle hub (T-033) and consume the API from
T-025.

## Acceptance criteria

- [ ] `/vehicles/:vehicleId/issues` lists issues (title, priority, status,
      reported date, resolved date) with loading, empty, and error states, and
      lets the user filter by status.
- [ ] Priority and status render as translated badges; priority options derive
      from `ISSUE_PRIORITY_CODES` and status from `ISSUE_STATUS_CODES`.
- [ ] A detail view shows the full issue, including description and the linked
      service record when present.
- [ ] Create and edit use the T-031 form stack with the shared Zod issue schema:
      reportedDate, resolvedDate, title, description, statusId, priorityId,
      relatedServiceRecordId.
- [ ] Resolved-date handling: setting status to `resolved` requires/defaults a
      `resolvedDate`; the UI enforces `resolvedDate >= reportedDate` and surfaces
      the server check error.
- [ ] Delete asks for confirmation.
- [ ] All reads/writes go through TanStack Query + the typed client; mutations
      invalidate the issue list and detail.
- [ ] Every user-facing string exists in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, filter, create, resolve, delete). If
      Chrome is blocked, fall back to documented structural verification and note it.

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/issues/**`
- `apps/web/src/features/issues/**` (components, hooks, query options)
- `apps/web/src/locales/pl/issues.json`, `apps/web/src/locales/en/issues.json`

## Out of scope

- API work for issues (T-025) — typed client consumed as-is.
- Creating service records from an issue (link to an existing one only; T-036
  owns service authoring).

## Implementation notes

- Tie `resolvedDate` visibility/requirement to the selected status so resolving
  an issue is a single coherent step; clear `resolvedDate` if status moves back
  to open/in-progress.
- The `relatedServiceRecordId` select should list the vehicle's service records
  (from the T-036 area's query) for linking.

## References

- Related tickets: T-033 (vehicle hub), T-025 (API issues), T-031 (forms),
  T-011 (typed client), T-036 (service records)
