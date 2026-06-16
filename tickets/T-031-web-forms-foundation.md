---
id: T-031
title: Web forms foundation — react-hook-form + Zod resolver + fields
status: ready
priority: high
owner: ~
dependencies: [T-008, T-019]
labels: [web, foundation]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-031 — Web: forms foundation (react-hook-form + Zod resolver)

## Goal

Stand up the shared forms stack in `apps/web` — react-hook-form wired to the
`@carnotea/shared` Zod schemas via `@hookform/resolvers/zod`, plus reusable
shadcn/ui field components with i18n error display — so every later feature
screen builds forms the same way.

## Context

Tailwind + shadcn/ui (T-008) and the shared Zod schemas (T-019) are in place, but
there is no form layer yet. Vehicles, fuel, charging, service, reminders, and
profile screens (T-033+) all need create/edit forms validated by the _same_ Zod
schemas the API enforces, with errors shown in the user's language. Building that
once here avoids each feature ticket reinventing field wiring, error mapping, and
submit handling.

## Acceptance criteria

- [ ] A `Form` primitive integrates react-hook-form with
      `@hookform/resolvers/zod` so a shared Zod schema is the single validation
      source; field types are derived via `z.infer`, not hand-written.
- [ ] Reusable, controlled field components on top of shadcn/ui: `TextField`,
      `NumberField`, `DateField`, `SelectField`, each with a label, description,
      and inline error slot, accessible (`label`/`aria-describedby`, error
      `aria-invalid`).
- [ ] Validation errors render localized messages in both `pl` and `en`; the Zod
      resolver's messages map to i18n keys (no raw English schema messages leak to
      the UI).
- [ ] Server-side validation errors (the API's `ApiError`/field errors) can be
      mapped back onto the matching fields via a shared `setServerErrors` helper.
- [ ] A submit wrapper handles pending/disabled state and surfaces a form-level
      error; success/`onSubmit` returns typed, parsed values.
- [ ] `SelectField` accepts `{ value, label }` options so lookup enums
      (e.g. `FUEL_TYPE_CODES`) can be rendered with translated labels.
- [ ] No hardcoded user-facing strings — labels/errors/placeholders route through
      i18n; verified in agent-browser with a representative example form
      (valid + invalid submit). If Chrome is blocked, note the structural fallback.
- [ ] Vitest/RTL covers: invalid input blocks submit and shows a localized error,
      valid input calls `onSubmit` with parsed values, and `setServerErrors` lands
      on the right field.

## Files to touch

- `apps/web/src/components/form/` (`Form`, `TextField`, `NumberField`,
  `DateField`, `SelectField`, `setServerErrors`)
- `apps/web/src/lib/forms/zod-i18n.ts` (Zod error → i18n key mapping)
- `apps/web/src/locales/{pl,en}/forms.json` (shared validation strings)
- `apps/web/src/components/form/*.test.tsx`

## Out of scope

- Any specific feature form (vehicles, fuel, …) — those are T-033+.
- File-upload / image fields.
- Multi-step/wizard forms and autosave.
- Changing the shared Zod schemas themselves (consumed from T-019 as-is).

## Implementation notes

- Use shadcn's form pattern (`Form`/`FormField`/`FormItem`/`FormControl`/
  `FormMessage`) as the base rather than rebuilding from scratch; keep our field
  components thin wrappers so shadcn updates flow through.
- For i18n errors, configure a custom Zod error map (or `zod-i18n-map`-style
  mapping) that emits stable keys; keep the key namespace under `forms.*` so
  feature locales only add field labels.
- Confirm the latest stable `@hookform/resolvers` against the installed
  `react-hook-form`/`zod` versions via `pnpm info` before pinning.

## References

- Related tickets: T-008 (Tailwind + shadcn), T-019 (shared Zod schemas/types),
  T-010 (i18n), T-033+ (feature screens that consume this)
- ADR: i18n pl/en — [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
