---
id: T-077
title: 'Web — apply the instrument-cluster design system to forms, detail pages, profile, and vehicle hub'
status: in_progress
priority: high
size: L
spec_version: 1
owner: ~
dependencies: [T-074]
labels: [web, design-system, consistency]
created_at: 2026-07-01
updated_at: 2026-07-01
closed_at: ~
---

# T-077 — Web design-system consistency pass

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Every screen in `apps/web` — not just the Dashboard/Dziennik and the 6 list
tabs — consistently uses the existing "instrument cluster" design primitives
(`PageHeader`, `ListCard`/`LogCard`, `StatStrip`, `ListCardActions`, `.tnum`,
`.label-micro`) with no divergent badge-color logic for the same status.

## Context

The redesign (epic T-069, phases T-070–T-074) landed the new design language
and applied it fully to the Dashboard panel/feed and to the 6 list-tab cards.
A design-consistency audit done after that work shipped (see conversation /
this ticket's Implementation notes for the full findings) found that every
**form**, **detail**, the **vehicle detail hub**, **profile**, and
**login/auth** screen still predates the redesign: plain `<h1 className="text-2xl
font-bold">` instead of `PageHeader`, raw `Card`/`CardHeader`/`CardTitle` +
hand-rolled `<dl>` grids instead of `ListCard`, page-level text `Button`s
instead of `ListCardActions`, and — the one real bug, not just a style
mismatch — **duplicated, drifted status→badge-color maps**: `issue-card.tsx`
and `reminder-card.tsx` use the new `success`/`warning` tonal variants, but
`issue-detail.tsx` and `reminder-detail.tsx` keep an older, independently
declared map that never uses `success`/`warning`, so the same status renders a
different badge color depending on whether you're looking at the list or the
detail page.

This is **not** a new visual direction — `PageHeader`, `ListCard`, `StatStrip`,
`ListCardActions`, and the `success`/`warning` badge variants already exist and
are proven correct on the screens that use them. This ticket is pure
consistency enforcement: reuse the same primitives everywhere.

Reference implementation to copy from: `features/dashboard/components/dashboard-page.tsx`,
`features/issues/components/issue-card.tsx`, `features/reminders/components/reminder-card.tsx`,
`components/PageHeader.tsx`, `components/ListCard.tsx`, `components/StatStrip.tsx`,
`components/ListCardActions.tsx`.

## Contract

n/a — no API/schema/route changes. This is a web-only UI consistency pass; no
new components are introduced, existing shared components are reused in
places that don't yet use them.

### Endpoints / routes

_n/a — no route changes._

### Request / response shapes

_n/a — no schema changes._

### Provides

- `features/issues/badge-variants.ts` — `issueStatusBadgeVariant`,
  `issuePriorityBadgeVariant` (single source of truth, replaces the two
  drifted local maps in `issue-card.tsx` and `issue-detail.tsx`).
- `features/reminders/badge-variants.ts` — `reminderStatusBadgeVariant`,
  `reminderDueStateBadgeVariant`, `dueStateKey` (single source of truth,
  replaces the two drifted local maps + duplicated helper in
  `reminder-card.tsx` and `reminder-detail.tsx`).

### Consumes

- Existing `components/PageHeader.tsx`, `components/ListCard.tsx`,
  `components/StatStrip.tsx`, `components/ListCardActions.tsx`,
  `components/ui/badge.tsx` variants — unchanged, just adopted more broadly.

## Acceptance criteria

- [x] Issue and reminder status/priority/due-state badges render the same
      color on the list card and the detail page for the same record (fixed
      by extracting one shared variant map per entity: `features/issues/badge-variants.ts`,
      `features/reminders/badge-variants.ts`).
- [x] Every form page (`fuel-log-form`, `charging-form`, `expense-form`,
      `service-form`, `issue-form`, `reminder-form`, `vehicle-form`) and every
      detail page (`fuel-log-detail`, `issue-detail`, `reminder-detail`) uses
      `PageHeader` instead of a hand-rolled `<h1 className="text-2xl
font-bold">`.
- [x] `vehicle-detail-hub.tsx` heading uses `PageHeader`; `profile-screen.tsx`
      and `gdpr-section.tsx` headings carry `font-display` for consistency
      (kept as plain headings, not `PageHeader`, since they have a
      description line under the title that `PageHeader` doesn't support —
      out of scope to extend `PageHeader`'s API for this).
- [x] `issue-detail.tsx`, `reminder-detail.tsx`, and `vehicle-detail-hub.tsx`
      field grids are rebuilt on `ListCard` instead of raw `Card` + hand-rolled
      `<dl>`.
- [x] `fuel-log-detail.tsx`'s hand-rolled stat grid is replaced by `StatStrip`.
- [x] `issue-detail.tsx`, `reminder-detail.tsx`, `fuel-log-detail.tsx`, and
      `vehicle-detail-hub.tsx` edit/delete/mark-done controls use
      `ListCardActions` (`EditActionIcon`, `DeleteAction`, `MarkDoneAction`)
      instead of page-level text `Button`s.
- [x] `vehicle-detail-hub.tsx`'s delete confirmation uses the same
      `window.confirm` pattern as every other feature list, instead of its own
      in-page confirmation card.
- [x] `pnpm --filter @carnotea/web lint/typecheck/test/build/format:check` all
      pass (repo-wide `pnpm test`/`pnpm build` re-run pending in Verification).
- [ ] Verified visually in a browser: issues list → issue detail, reminders
      list → reminder detail (badge colors match), one form page, one detail
      page, vehicle detail hub, profile. **Not done — Docker/dev stack was
      down during this pass; needs a follow-up visual check once the stack is
      up.**

## Test matrix

| Case                                  | Input                 | Expected                                          |
| ------------------------------------- | --------------------- | ------------------------------------------------- |
| issue `in_progress` on list vs detail | same issue record     | both render `warning` badge                       |
| issue `resolved` on list vs detail    | same issue record     | both render `success` badge                       |
| reminder `done` on list vs detail     | same reminder record  | both render `success` badge                       |
| reminder `due_soon` on list vs detail | same reminder record  | both render `warning` badge                       |
| unmapped/unexpected status string     | status not in the map | falls back to `default`/`outline`, does not throw |

## Files to touch

- `apps/web/src/features/issues/badge-variants.ts` (new)
- `apps/web/src/features/reminders/badge-variants.ts` (new)
- `apps/web/src/features/issues/components/issue-card.tsx`,
  `issue-detail.tsx`
- `apps/web/src/features/reminders/components/reminder-card.tsx`,
  `reminder-detail.tsx`
- `apps/web/src/features/{fuel,charging,expenses,service,issues,reminders,vehicles}/components/*-form.tsx`
- `apps/web/src/features/fuel/components/fuel-log-detail.tsx`
- `apps/web/src/features/vehicles/components/vehicle-detail-hub.tsx`
- `apps/web/src/features/profile/components/profile-screen.tsx`
- `apps/web/src/features/gdpr/components/gdpr-section.tsx`

## Out of scope

- Mobile layout / touch-target / reduced-motion pass — that's T-075.
- Any change to the `success`/`warning`/`destructive` badge palette itself —
  this ticket only makes existing variants consistently applied.
- `routes/login.tsx` / auth forms visual pass — pre-auth shell is a
  deliberately distinct context; not touched here.
- Unifying the 4 independently-declared page-shell spacing wrappers
  (`PageContainer` vs dashboard/profile/login inline wrappers) into one — flag
  as a follow-up if it recurs, but don't block this ticket on it.

## Implementation notes

Audit findings this ticket is based on (full detail, kept here so the next
agent doesn't have to re-derive them):

- Color-token discipline is already good app-wide — no raw hex, no
  `text-gray-*`/`bg-slate-*` bypasses found anywhere. The gap is structural
  (component reuse), not palette drift.
- The 6 list-tab cards + `activity-entry.tsx` are the correct reference for
  badge variants, `ListCard` usage, and `ListCardActions` usage — copy their
  patterns, don't invent new ones.
- `vehicle-detail-hub.tsx` was the most-diverged file (4 separate raw `Card`
  blocks, ad-hoc padding, zero badges, its own one-off in-page
  delete-confirmation `Card`) — done last, now on `PageHeader` + `ListCard` +
  `ListCardActions` + `window.confirm`, matching every other feature.
- `profile-screen.tsx` and `gdpr-section.tsx` were deliberately **not**
  converted to `PageHeader` — both have a description line under the title
  that `PageHeader`'s `{title, action}` API doesn't support. Only added
  `font-display` to their headings for typographic consistency. If this
  recurs elsewhere, consider extending `PageHeader` with an optional
  `description` slot as a follow-up (not done here — keep this ticket's
  blast radius to reuse, not API changes).
- Removed a few duplicate rows from `issue-detail.tsx`/`reminder-detail.tsx`
  detail grids (status/priority were shown twice: once as badges, once as
  plain-text `dt`/`dd` rows) — that duplication was leftover clutter from the
  old layout, not information the new `ListCard` layout needs to preserve.
- Done: badges → headings (7 forms + 3 details) → cards (`issue-detail`,
  `reminder-detail`, `fuel-log-detail`, `vehicle-detail-hub`) → actions →
  `vehicle-detail-hub` full pass → profile/gdpr heading font. All of
  `pnpm --filter @carnotea/web {typecheck,lint,test,build,format:check}` pass.
- **Outstanding:** a real browser visual pass (Docker/dev stack was down
  during this session) — do it before closing this ticket.

## Verification

- `pnpm --filter @carnotea/web lint && pnpm --filter @carnotea/web typecheck && pnpm --filter @carnotea/web test` → all pass
- `pnpm format:check` → clean
- Manual: open an issue and a reminder with a non-default status, confirm the
  badge color matches between the list card and the detail page.

## References

- Plan: [`docs/redesign/cockpit-logbook-plan.md`](../docs/redesign/cockpit-logbook-plan.md)
- Reference components: `components/PageHeader.tsx`, `components/ListCard.tsx`,
  `components/StatStrip.tsx`, `components/ListCardActions.tsx`
- Related tickets: T-069 (epic), T-074 (dashboard composition, the reference
  implementation), T-075 (mobile/a11y — separate, unblocked by this)
