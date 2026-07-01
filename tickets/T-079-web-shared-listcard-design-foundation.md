---
id: T-079
title: 'Web — shared ListCard/StatStrip primitives and instrument-cluster design tokens'
status: done
priority: high
size: L
spec_version: 1
owner: ~
dependencies: []
labels: [web, design-system, refactor]
created_at: 2026-06-28
updated_at: 2026-07-02
closed_at: 2026-07-02
---

# T-079 — Web shared ListCard/StatStrip primitives and instrument-cluster design tokens

> Filed retroactively: this work shipped before the ticket was written, in
> direct response to conversational feedback rather than a pre-existing
> ticket. Per AGENTS.md "Find a ticket before non-trivial work", it's recorded
> here now so the PR has a ticket to close and the history is honest about
> what happened and why.

## Goal

Fix the Service-tab delete-button overlap bug by extracting one shared,
reusable list-item component family used by all six list tabs, then apply a
distinctive, coherent visual identity ("instrument cluster": heritage-green
accent, Space Grotesk + Inter, tabular-nums readouts) across the whole app
instead of six independently-styled list views.

## Context

Two direct user requests, handled in sequence in the same working session:

1. An unlabeled number was overlapping the delete button on the Service tab's
   list cards; more broadly, every list tab (fuel, charging, service,
   expenses, issues, reminders) had bespoke, inconsistent card behavior.
2. The app looked functional but visually generic — inconsistent fonts,
   inconsistent weights, no unifying identity. The `frontend-design` skill was
   used to brainstorm and land on a specific, deliberate direction rather than
   a generic default.

This foundation predates and is depended on by the whole T-069 redesign epic
(T-070–T-077): every later phase's UI is built on `ListCard`, `StatStrip`,
`ListCardActions`, and the design tokens introduced here.

## Contract

_n/a — no API/schema changes. Web-only component extraction + design tokens._

### Provides

- `components/ListCard.tsx` — shared card chrome (primary/badges/actions
  header + flexible body) used directly by service, expenses, issues,
  reminders.
- `components/LogCard.tsx` (rewritten) — `ListCard` + `StatStrip` for
  transactional logs (fuel, charging).
- `components/ListCardActions.tsx` — `EditActionIcon`, `DeleteAction`,
  `MarkDoneAction`, `editActionClassName` shared action affordances.
- `components/StatStrip.tsx` — the tabular-nums readout grid, the app's
  signature element.
- `features/issues/badge-variants.ts`, `features/reminders/badge-variants.ts`
  — single source of truth for status/priority/due-state → `Badge` variant,
  consumed by this ticket's own cards and later reused by T-073 and T-077.
- Design tokens in `styles/globals.css` (`--primary` heritage green, `--radius`,
  `.tnum`, `.label-micro`), self-hosted Inter + Space Grotesk in
  `public/fonts/`, updated `components/ui/{badge,button,card,input,select}.tsx`
  and `components/PageHeader.tsx`.

### Consumes

_n/a — first design-system layer; nothing to consume yet._

## Acceptance criteria

- [x] The Service-tab delete button no longer overlaps an unlabeled number;
      delete/edit are `ListCardActions` icon buttons like every other tab.
- [x] All six list tabs (fuel, charging, service, expenses, issues, reminders)
      render through the shared `ListCard`/`LogCard` family.
- [x] A single, deliberate visual direction (heritage green, Space Grotesk +
      Inter, tabular-nums) replaces the previous inconsistent typography
      across badges, buttons, cards, inputs.
- [x] `pnpm --filter @carnotea/web typecheck/lint/test/build/format:check` all
      pass.

## Test matrix

_UI/visual work — covered by existing component tests
(`Form.test.tsx`, `LanguageSwitcher.test.tsx`, etc.) continuing to pass
against the new components; no dedicated new test file, consistent with how
this repo tests shared presentational components._

## Files to touch

- `apps/web/src/components/{ListCard,LogCard,ListCardActions,StatStrip,PageHeader}.tsx`
- `apps/web/src/components/ui/{badge,button,card,input,select}.tsx`
- `apps/web/src/styles/globals.css`, `apps/web/index.html`, `apps/web/public/fonts/`
- `apps/web/src/features/{fuel,charging,service,expenses,issues,reminders}/components/*`
- `apps/web/src/features/issues/badge-variants.ts`,
  `apps/web/src/features/reminders/badge-variants.ts`

## Out of scope

- The T-069 redesign epic itself (new panel/feed screens) — separate, later
  tickets.
- Shell/nav restyling — T-074.

## Implementation notes

Landed via direct conversational iteration (bug fix → shared component →
`frontend-design` skill brainstorm → design-token application), not a
pre-planned spec. See `docs/agents/lessons.md` if a similar "fix this generic
look" request recurs — the working pattern was: brainstorm named palette/type
options, get explicit user picks via forced choice, then apply.

## Verification

- `pnpm --filter @carnotea/web typecheck` → clean
- `pnpm --filter @carnotea/web lint` → clean
- `pnpm --filter @carnotea/web test` → all pass
- `pnpm --filter @carnotea/web build` → clean

## References

- Related tickets: T-069 (epic that builds on this foundation)
