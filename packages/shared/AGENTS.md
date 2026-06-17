# packages/shared AGENTS.md

Area-specific rules for `@carnotea/shared`. These override the root `AGENTS.md`
for any file under `packages/shared/`.

## Structure

```
src/
  constants/   # as-const arrays + inferred union types, one file per lookup table
  schemas/     # Zod schemas for request / response / domain shapes
  index.ts     # re-exports everything
```

## Rules

- Constants mirror the SQL seed data in `sql/07_seed_data.sql`. If the seed
  changes, update the matching constant file in the same PR.
- Constants are exported as `as const` arrays plus an inferred union type:
  `export const FOO_CODES = [...] as const; export type FooCode = (typeof FOO_CODES)[number];`
- Schemas live under `src/schemas/`. Use `z.infer` for derived types — never
  write a parallel TS type by hand.
- Keep runtime dependencies minimal: only `zod` unless an ADR approves more.
- Build: `tsc -p tsconfig.build.json` (emits to `dist/`).
  Typecheck only: `tsc --noEmit`.
- Test: `vitest run` (`pnpm --filter @carnotea/shared test`). Co-locate
  `*.test.ts` next to the schema. Tests are excluded from the build via
  `tsconfig.build.json`, so they never ship in `dist/`.

## Schema-per-entity convention

Domain schemas mirror `packages/db/src/schema/<entity>.ts` as the **API
contract** (what crosses the wire), one module per entity:

- Each module exports a base/read schema (`XxxSchema`) plus `XxxCreateSchema`
  and `XxxUpdateSchema`. `Update` is the default-free createable shape
  `.partial()`.
- `Create` omits server-owned fields: `id`, `createdAt`, `updatedAt`,
  `userId`/`vehicleId` (these come from the route + auth context), and any
  DB-computed value (`totalCost`, `totalPrice`, `currentMileage`,
  `notifiedAt`, sync-managed `sourceType`/`sourceId`).
- Column defaults (`currencyCode`, `isFullTank`, `laborCost`, `defaultPrice`,
  `quantity`, …) live **only** in `Create` via `.extend()`. Derive `Update`
  from the default-free createable shape, never from `Create`, so an omitted
  field is left untouched (PATCH) rather than reset to its create-time default.
- Lookup/enum fields use the `constants/*` code lists via `z.enum` and expose
  the **code** (`fuelType`, `chargerType`, `status`, `priority`, `category`),
  not the numeric FK id the DB stores. The API maps code ↔ id.
- `numeric(precision, 2)` columns are read back from Postgres as strings, so
  decimal fields use `z.coerce.number()` bounded to the column precision
  (`decimalField`/`moneyField`/`positiveDecimalField` in `_shared.ts`, which
  take the precision — `8` or `10`) — the one decimal convention everywhere.
  `integer` columns stay `z.number().int()`.
- `date` columns → `z.iso.date()`; `timestamp` columns → `z.iso.datetime()`.
- Bounds and check constraints are mirrored (mileage `>= 0`, SoC `0..100`,
  currency = 3 chars, `socStart < socEnd`, `resolvedDate >= reportedDate`,
  reminder needs a `dueDate` or `dueMileage`). Cross-field invariants that need
  the persisted row (e.g. update-time trigger checks) are re-validated in the
  API layer, not here.
- List endpoints reuse `ListQuerySchema` (pagination + sort + date range);
  extend it rather than re-declaring pagination.
- Shared field helpers live in `src/schemas/_shared.ts`. Re-export every module
  from `src/schemas/index.ts`.
