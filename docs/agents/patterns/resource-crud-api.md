# Pattern: owned-resource CRUD API

The canonical shape every user-scoped resource endpoint in `apps/api` copies.
Written once here so a ticket only has to state its **delta** (its fields, its
invariants, its sync hooks) instead of re-deriving CRUD, ownership, error
mapping, and validation every time.

Reference implementations to copy, in order of closeness:

- `apps/api/src/vehicles/` — the root owned resource (lookup-code FK, unique
  conflict → 409). T-020.
- `apps/api/src/fuel-logs/` — a vehicle-scoped child with server-computed fields
  and a mileage-sync hook. T-022.

Read those two before writing a new resource. This doc is the spec; they are the
worked example. Area rules live in [`apps/api/AGENTS.md`](../../../apps/api/AGENTS.md)
§ "Resource modules" — this expands them into a ticket-ready contract.

---

## Route shape

A resource is either **vehicle-scoped** (a child of a vehicle: fuel logs,
charging sessions, service records, issues, reminders, expenses, mileage
readings) or **user-scoped** (the vehicle itself, the profile).

Vehicle-scoped resources nest the collection under the parent and address the
item by its own id:

| Method | Path                                        | Auth    | Success   | Body      | Errors                                       |
| ------ | ------------------------------------------- | ------- | --------- | --------- | -------------------------------------------- |
| GET    | `/api/vehicles/{vehicleId}/<resource>`      | session | 200 `T[]` | —         | 401, 404 NOT_FOUND                           |
| POST   | `/api/vehicles/{vehicleId}/<resource>`      | session | 201 `T`   | `TCreate` | 400 VALIDATION_ERROR, 401, 404, 409 CONFLICT |
| GET    | `/api/vehicles/{vehicleId}/<resource>/{id}` | session | 200 `T`   | —         | 401, 404 NOT_FOUND                           |
| PATCH  | `/api/vehicles/{vehicleId}/<resource>/{id}` | session | 200 `T`   | `TUpdate` | 400, 401, 404, 409                           |
| DELETE | `/api/vehicles/{vehicleId}/<resource>/{id}` | session | 204       | —         | 401, 404 NOT_FOUND                           |

- OpenAPI path format is `{param}`, not `:param`, in `zodRoute(...)`.
- `TUpdate = TCreate.partial()` unless the ticket says otherwise.
- List is **newest-first** on the resource's natural date column
  (`fuelDate`, `chargeDate`, `serviceDate`, `reportedDate`, `expenseDate`…),
  tie-broken by a stable secondary (`mileage` or `id`).

## Error envelope and status codes

Every error body is `ErrorResponseSchema` from `@carnotea/shared`:
`{ code: string, message: string, issues?: ApiIssue[] }`. Register it in
`zodRoute(...)` on every non-2xx response with `schema: ErrorResponseSchema`.

| Status | `code`             | When                                                                                                                                                                                             |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 400    | `VALIDATION_ERROR` | Body/query/params fail the Zod schema (thrown by `ZodValidationPipe`), or a domain invariant the schema expresses (`socStart < socEnd`, resolved-date rule). `issues[]` carries the field paths. |
| 401    | (better-auth)      | No valid session. Enforced by `@UseGuards(AuthGuard)`.                                                                                                                                           |
| 404    | `NOT_FOUND`        | Row absent **or** owned by another user — they are indistinguishable on purpose.                                                                                                                 |
| 409    | `CONFLICT`         | A unique constraint (SQLSTATE `23505`) was violated. Map via `.cause`, never let a 500 leak.                                                                                                     |

**Validation is always `400 VALIDATION_ERROR`, never 422.** The pipe throws
`BadRequestException`. (Some older tickets said 422 — that is wrong; follow the
code.)

## Ownership

- Scope **every** read and write by the owner in the `WHERE` clause; never
  fetch-then-check. For vehicle-scoped resources, first assert the parent vehicle
  is owned (`eq(vehicles.id, vehicleId) AND eq(vehicles.userId, userId)`), then
  filter the child by `vehicleId`.
- A missing row and another user's row both return **404, never 403** — existence
  must not leak across users. This is non-negotiable and every resource needs a
  cross-user test.

## Decimals, money, and numbers

Settled convention (see `packages/shared/src/schemas/_shared.ts`):

- `numeric(p, 2)` columns are read from Postgres as **strings** and written as
  **strings**; the API contract exposes them as **numbers**. The service does the
  `String(...)` / `Number(...)` conversion at the DB edge.
- Use the field helpers: `moneyField(p)`, `positiveDecimalField(p)`,
  `decimalField(p)`, `mileageField()`, `socPercentField()`, `currencyCodeField()`,
  `dateField()`, `timestampField()`, `uuidField()`. Match the column precision.
- **Server-computed money is never read from the body.** Compute it
  (`Math.round(a * b * 100) / 100`) to match the DB `round(a*b, 2)` check, and
  drop the field from the create/update schema (see `FuelLogCreateSchema` omitting
  `totalCost`).

## Lookup codes (code ↔ id)

Contracts expose stable string **codes** (`fuelType`, `chargerType`, issue
`status`/`priority`, reminder `status`, expense `category`); the DB stores the
lookup-table **id**. Resolve code→id on write, join id→code on read. An unknown
code is a clean **400 VALIDATION_ERROR**, never an FK 500. Reuse the resolver
shape from `VehiclesService.resolveFuelTypeId`; cache the map when the lookup is
small and static.

## Derived-data hooks

Some resources are also a **mileage source** and/or a **cost source**. The
service must wrap its own write **and** the derived writes in **one**
`db.transaction(async (tx) => { ... })`, passing `tx` to the sync seams, so a
crash can never leave a source row without its derived reading/expense:

- Mileage: `MileageSyncService.syncDerivedReading(tx, { vehicleId, sourceType, sourceId, mileage, date })`
  on create/update, `removeDerivedReading(tx, { vehicleId, sourceType, sourceId })`
  on delete.
- Cost: `CostSyncService.upsertFromSource(tx, ...)` / `removeForSource(tx, ...)`.

Both seams take the caller's `tx` as their first argument — they must **not** open
their own transaction (that breaks composition). `sourceType` ∈
`fuel_log | charging_session | service_record`; upserts are keyed by
`(vehicleId, sourceType, sourceId)` and are idempotent.

> The original `MileageSyncService` (created in T-022) opens its own transaction
> and `FuelLogsService` calls it after a separate insert — i.e. not atomic.
> T-061 retrofits both seams to the `tx`-first signature above; new resources
> follow this contract from the start.

## Module layout

```
apps/api/src/<resource>/
  <resource>.module.ts       # imports AuthModule; registered in app.module.ts
  <resource>.controller.ts   # @UseGuards(AuthGuard); routes via zodRoute()
  <resource>.service.ts      # @Inject(DB); all ownership + business logic
  <resource>.controller.test.ts
  <resource>.service.test.ts
  <resource>.integration.test.ts   # describe.skipIf(!process.env.DATABASE_URL)
```

- Schemas (`TSchema`, `TCreateSchema`, `TUpdateSchema`) live in
  `@carnotea/shared`, types via `z.infer`. Never hand-write a parallel type.
- Tests are **co-located `*.test.ts`** (and `*.integration.test.ts` gated on
  `DATABASE_URL`). There is no `apps/api/test/*.e2e-spec.ts` directory — older
  tickets that reference one are wrong; follow the codebase.

## Baseline test matrix (every CRUD resource inherits this)

A ticket lists only the rows specific to its invariants on top of these:

| Case                                | Input                           | Expected                                           |
| ----------------------------------- | ------------------------------- | -------------------------------------------------- |
| list is owner-scoped + newest-first | two vehicles, mixed rows        | only owner's rows, ordered by date desc            |
| create happy path                   | valid `TCreate`                 | 201, row persisted, response matches contract      |
| server-computed field ignores body  | client sends `totalCost: 999`   | stored value is the computed one                   |
| update partial                      | `TUpdate` with one field        | 200, only that field changed                       |
| delete                              | valid id                        | 204, row gone (+ derived rows cleaned if a source) |
| cross-user read                     | another user's `id`/`vehicleId` | 404 NOT_FOUND (not 403)                            |
| unknown lookup code                 | bad `fuelType`/`status`/…       | 400 VALIDATION_ERROR (not 500)                     |
| route in OpenAPI                    | —                               | path present in `/openapi.json`                    |

## Standard verification

```bash
pnpm --filter @carnotea/api test <resource>      # unit + controller tests pass
pnpm --filter @carnotea/api typecheck            # 0 errors
curl -s localhost:3001/openapi.json | jq '.paths | keys[] | select(startswith("/api/vehicles/{vehicleId}/<resource>"))'
```

Integration tests (real DB) run only when `DATABASE_URL` is set; report them as
skipped otherwise — that is honest, not a gap.
