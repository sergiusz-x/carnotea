# Pattern: web feature screens

The canonical shape every `apps/web` feature area copies. The **mechanics**
(structure, routing, query rules, forms, i18n, styling) are already specified in
[`apps/web/AGENTS.md`](../../../apps/web/AGENTS.md) — read it first; do not
duplicate it. This doc is the **ticket contract**: what a screen ticket must pin
so an agent builds the same thing twice.

Reference implementation to copy: `apps/web/src/features/health/` (route +
`queries.ts` + component owning loading/error/success) and the forms usage in
`apps/web/AGENTS.md` § Forms.

---

## What a screen ticket pins

### Routes

List every route and the component that owns it. Code-based routing (ADR-0005);
register in `src/lib/router.ts`.

| Route                       | Screen     | Data                      |
| --------------------------- | ---------- | ------------------------- |
| `/vehicles`                 | list       | `vehiclesQueryOptions`    |
| `/vehicles/$vehicleId`      | detail hub | `vehicleQueryOptions(id)` |
| `/vehicles/$vehicleId/edit` | edit form  | same                      |

### Query keys

Hierarchical so invalidation is surgical. Pin them in the ticket:

```
['vehicles']                          # list
['vehicles', id]                      # one vehicle
['vehicles', id, 'fuel-logs']         # a child collection
```

Mutations invalidate the narrowest key that covers the change.

### UI states

Every data-driven screen enumerates all four — none is optional:

- **loading** — skeleton/spinner.
- **empty** — explicit empty state with the primary call-to-action.
- **error** — the normalized `ApiError` message; a retry affordance.
- **success** — the data.

### Forms

Use the T-031 stack (`useZodForm` + the shared `@carnotea/shared` schema +
field components). Server validation errors map back onto fields with
`setServerErrors` (`ApiError.issues[].path` → field name). Never hand-roll a
form or a field-level catch.

### i18n

One namespace per feature (`vehicles`, `fuel-logs`, …), registered in
`src/i18n/index.ts` (`ns` + `resources`) and `i18next.d.ts`. **Every** string in
both `pl` and `en`, including `aria-label`s and the brand. `react/jsx-no-literals`
fails the build on any untranslated JSX text.

### Accessibility baseline

- Forms: every input has an associated `<label>`; errors linked via `aria`.
- Interactive elements reachable and operable by keyboard; visible focus.
- Tested by role/label in Vitest (`getByRole`, `getByLabelText`), not test ids.

## Mutations need the typed client's write methods

`src/lib/api/client.ts` currently implements **`GET` only**. Any screen ticket
that creates/edits/deletes must either depend on a ticket that adds
`POST`/`PATCH`/`DELETE` to `apiClient` (same typed-from-OpenAPI shape, normalizing
to `ApiError`), or include that extension in its own scope and say so explicitly
in `Provides`. Do not scatter raw `fetch` calls through features — extend the one
client.

## Baseline test matrix (every screen inherits this)

| Case                  | Expected                                         |
| --------------------- | ------------------------------------------------ |
| loading state renders | skeleton/spinner shown before data resolves      |
| empty state renders   | CTA shown when the collection is empty           |
| error state renders   | `ApiError` message shown on a failed request     |
| success renders data  | rows/fields visible, queried by role/label       |
| form validation       | invalid submit shows field errors (both locales) |
| server error mapping  | API 400 `issues` surface on the right fields     |
| i18n parity           | every used key exists in `pl` and `en`           |

## Standard verification

```bash
pnpm --filter @carnotea/web dev            # start the dev server (port 5173)
agent-browser open http://localhost:5173/<route>
agent-browser snapshot -i                  # exercise list/detail/create/edit/delete
pnpm --filter @carnotea/web test <feature> # component tests pass
pnpm --filter @carnotea/web typecheck      # 0 errors (incl. i18n key types)
```

If Chrome is blocked, fall back to the documented structural verification in
`docs/agents/self-review.md` §UI verification and **report the UI as not visually
verified** — never tick a UI AC you didn't see.
