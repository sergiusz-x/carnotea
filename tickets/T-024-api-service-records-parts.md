---
id: T-024
title: API — Service records + parts CRUD
status: ready
priority: medium
owner: ~
dependencies: [T-020]
labels: [api, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-024 — API: Service records + parts

## Goal

Expose CRUD for service records scoped to an owned vehicle, with line-item parts
attached through the `service_parts` join and a server-derived cost rollup,
validated by the T-019 schemas and surfaced in `/openapi.json`.

## Context

`service_records` holds a dated workshop visit with `mileage`, `title`,
`description`, `laborCost`, `totalCost`, and `workshopName`; the DB enforces
`totalCost >= laborCost`. Parts live in a shared `parts` catalog (deduped on
`manufacturer`+`partNumber`) and are linked per visit via `service_parts`, where
each line enforces `totalPrice = round(quantity * unitPrice, 2)` and a unique
`(serviceRecordId, partId)`. A record is also a mileage source (T-021) and a
cost source feeding expenses (T-026), so it must derive its own totals rather
than trust the client.

## Acceptance criteria

- [ ] `GET /vehicles/:vehicleId/service-records` lists owned records, newest
      `serviceDate` first; single-item `GET`/`PATCH`/`DELETE` are ownership-scoped
      through the parent vehicle (cross-user → 404).
- [ ] `POST` creates from `ServiceRecordCreate`, optionally with an array of
      part lines in one request; ownership and required `title`/`mileage`/
      `serviceDate` enforced.
- [ ] Part lines are managed through the record: each line resolves or creates a
      `parts` row, then writes a `service_parts` row with
      `totalPrice = round(quantity * unitPrice, 2)` computed server-side.
- [ ] `service_records.totalCost` is derived as `laborCost + sum(line totalPrice)`
      on every create/update, and the DB invariant `totalCost >= laborCost`
      always holds.
- [ ] A duplicate `(serviceRecordId, partId)` line is a clean 409; an unknown
      part reference is a clean 400, not an FK 500.
- [ ] On create/update/delete the record's derived mileage reading is synced via
      the T-021 helper (`sourceType = 'service_record'`).
- [ ] Routes registered via `zodRoute()` and present in `/openapi.json`.
- [ ] Vitest covers the cost rollup, a duplicate-part 409, and a cross-user 404.

## Files to touch

- `apps/api/src/service-records/` (module, routes, service)
- `apps/api/src/service-records/service-parts.service.ts` (line + rollup logic)
- `apps/api/src/service-records/*.test.ts`

## Out of scope

- A standalone parts-catalog CRUD or part-identifier management — parts are only
  resolved/created as a side effect of a service line here.
- Writing the matching `expenses` row (`service`/`parts` categories) — that is
  T-026 (cost sync).
- Aggregate maintenance-cost analytics — that is T-028.

## Implementation notes

- Recompute `totalCost` from the persisted lines after every mutation in the same
  transaction; never accept `totalCost`/`totalPrice` from the body.
- Resolve a part by `(manufacturer, partNumber)` to reuse the catalog row and
  honour `parts_manufacturer_number_uq`; only insert when no match exists.
- `laborCost`/`totalCost` default to `'0'` at the DB layer — don't require them
  on create; treat decimals per the T-019 convention (string vs coerced number).

## References

- Related tickets: T-020 (vehicles), T-021 (mileage sync), T-026 (cost sync),
  T-028 (analytics), T-025 (issues link records via `relatedServiceRecordId`)
- Schema: `packages/db/src/schema/service-records.ts`,
  `packages/db/src/schema/parts.ts`, `packages/db/src/schema/service-parts.ts`
