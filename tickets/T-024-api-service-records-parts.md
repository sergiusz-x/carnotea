---
id: T-024
title: API — Service records + parts CRUD
status: ready
priority: medium
size: L
spec_version: 1
owner: ~
dependencies: [T-020, T-021]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-21
closed_at: ~
---

# T-024 — API: Service records + parts

## Goal

Expose CRUD for service records scoped to an owned vehicle, with line-item parts
attached through the `service_parts` join and a server-derived cost rollup,
surfaced in `/openapi.json`.

## Context

`service_records` holds a dated workshop visit with `mileage`, `title`,
`description`, `laborCost`, `totalCost`, `workshopName`; the DB enforces
`totalCost >= laborCost`. Parts live in a shared `parts` catalog (deduped on
`manufacturer`+`partNumber`) and are linked per visit via `service_parts`, where
each line enforces `totalPrice = round(quantity * unitPrice, 2)` and a unique
`(serviceRecordId, partId)`. A record is also a mileage source (T-021) and a cost
source feeding expenses (T-026), so it derives its own totals rather than trust
the client.

`size: L` — the parts join + rollup makes this bigger than a plain CRUD; it stays
one PR because the rollup and the record are inseparable. Follows
[`patterns/resource-crud-api.md`](../docs/agents/patterns/resource-crud-api.md).

## Contract

### Endpoints

| Method | Path                                             | Auth    | Success               | Errors                                       |
| ------ | ------------------------------------------------ | ------- | --------------------- | -------------------------------------------- |
| GET    | `/api/vehicles/{vehicleId}/service-records`      | session | 200 `ServiceRecord[]` | 401, 404 NOT_FOUND                           |
| POST   | `/api/vehicles/{vehicleId}/service-records`      | session | 201 `ServiceRecord`   | 400 VALIDATION_ERROR, 401, 404, 409 CONFLICT |
| GET    | `/api/vehicles/{vehicleId}/service-records/{id}` | session | 200 `ServiceRecord`   | 401, 404 NOT_FOUND                           |
| PATCH  | `/api/vehicles/{vehicleId}/service-records/{id}` | session | 200 `ServiceRecord`   | 400, 401, 404, 409 CONFLICT                  |
| DELETE | `/api/vehicles/{vehicleId}/service-records/{id}` | session | 204                   | 401, 404 NOT_FOUND                           |

List newest-first on `serviceDate`. The `ServiceRecord` response embeds its
`parts: ServicePartLine[]`.

### Request / response shapes

- `ServiceRecordSchema`, `ServiceRecordCreateSchema`, `ServiceRecordUpdateSchema`,
  `ServicePartLineSchema` in `@carnotea/shared` (`service-record.ts`,
  `service-part.ts`, exist). Create accepts an optional `parts[]` array of lines.
- A part line carries `{ name, manufacturer?, partNumber?, quantity, unitPrice }`;
  `totalPrice` and the record's `totalCost` are **server-derived**, omitted from
  the request.

### Provides

- A service record is a mileage source (`sourceType='service_record'`) and a cost
  source for T-026; its `totalCost` is the authoritative number T-026 syncs.

### Consumes

- `MileageSyncService.syncDerivedReading` / `removeDerivedReading` (T-021, frozen).
- Vehicle ownership (T-020).

## Acceptance criteria

- [ ] List + single-item `GET`/`PATCH`/`DELETE` ownership-scoped through the
      parent vehicle (cross-user → 404).
- [ ] `POST` creates from `ServiceRecordCreate`, optionally with part lines in one
      request; `title`/`mileage`/`serviceDate` required.
- [ ] Each part line resolves or creates a `parts` row (by `manufacturer`+
      `partNumber`), then writes a `service_parts` row with
      `totalPrice = round(quantity * unitPrice, 2)` computed server-side.
- [ ] `service_records.totalCost = laborCost + sum(line totalPrice)`, recomputed on
      every create/update in the same transaction; `totalCost >= laborCost` holds.
- [ ] A duplicate `(serviceRecordId, partId)` line is a clean 409 CONFLICT; an
      unknown part reference is a clean 400, not an FK 500.
- [ ] On create/update/delete the record's derived mileage reading is synced via
      the T-021 helper (`sourceType = 'service_record'`).
- [ ] Routes registered via `zodRoute()` and present in `/openapi.json`.

## Test matrix

Inherits the baseline matrix, plus:

| Case                            | Input                                    | Expected                     |
| ------------------------------- | ---------------------------------------- | ---------------------------- |
| cost rollup                     | labor=100, line(2×50)                    | `totalCost=200.00`           |
| line totalPrice computed        | quantity=2, unitPrice=50, body total=999 | line `totalPrice=100.00`     |
| totalCost ≥ laborCost invariant | labor=100, no lines                      | `totalCost=100.00`, persists |
| duplicate part line             | two lines, same resolved `partId`        | 409 CONFLICT                 |
| catalog reuse                   | line matching existing `(mfr, number)`   | no new `parts` row inserted  |
| mileage synced                  | valid record                             | derived reading exists       |
| cross-user isolation            | another user's `vehicleId`               | 404 NOT_FOUND                |

## Files to touch

- `apps/api/src/service-records/` (module, controller, service)
- `apps/api/src/service-records/service-parts.service.ts` (line + rollup logic)
- `apps/api/src/service-records/*.test.ts`

## Out of scope

- A standalone parts-catalog CRUD or part-identifier management — parts are only
  resolved/created as a side effect of a service line here.
- Writing the matching `expenses` row — that is T-026.
- Aggregate maintenance-cost analytics — that is T-028.

## Implementation notes

- Recompute `totalCost` from the persisted lines after every mutation in the same
  transaction; never accept `totalCost`/`totalPrice` from the body.
- Resolve a part by `(manufacturer, partNumber)` to reuse the catalog row and
  honour `parts_manufacturer_number_uq`; only insert when no match exists. Note
  both columns are nullable, so define the match rule for null parts explicitly
  (treat a line with no `partNumber` as always-new, never deduped).
- `laborCost`/`totalCost` default to `'0'` at the DB layer — don't require them on
  create.

## Verification

- `pnpm --filter @carnotea/api test service-records` → all pass
- `curl -s localhost:3001/openapi.json | jq '.paths | keys[] | select(contains("service-records"))'` → all 5 routes present

## References

- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md)
- Reference impl: `apps/api/src/fuel-logs/` (T-022)
- Related tickets: T-020, T-021, T-026, T-028, T-025 (issues link records via
  `relatedServiceRecordId`)
- Schema: `packages/db/src/schema/service-records.ts`, `parts.ts`,
  `service-parts.ts`; `packages/shared/src/schemas/service-record.ts`,
  `service-part.ts`
