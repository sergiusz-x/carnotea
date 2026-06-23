---
id: T-036
title: Web service-record screens with linked parts
status: done
priority: medium
size: L
spec_version: 1
owner: ~
dependencies: [T-033, T-024]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-23
closed_at: ~
---

# T-036 — Web service-record screens with linked parts

## Goal

Let a user view, add, edit, and delete service records for a vehicle, including the
parts attached to each record, driven by TanStack Query against the typed client.

## Context

Service records capture workshop visits and repairs and aggregate labor plus parts
into a total cost that feeds expenses. Each record can reference one or more parts via
the `service_parts` join. They hang off the vehicle hub (T-033) and consume the
combined service+parts API from T-024. `size: L` because of the inline parts field
array.

Follows [`patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).

## Contract

### Routes

| Route                                   | Screen      | Data                                      |
| --------------------------------------- | ----------- | ----------------------------------------- |
| `/vehicles/$vehicleId/service`          | list        | `serviceRecordsQueryOptions(vehicleId)`   |
| `/vehicles/$vehicleId/service/new`      | create form | —                                         |
| `/vehicles/$vehicleId/service/$id`      | detail      | `serviceRecordQueryOptions(vehicleId,id)` |
| `/vehicles/$vehicleId/service/$id/edit` | edit form   | same                                      |

### Query keys

```
['vehicles', vehicleId, 'service-records']        # list
['vehicles', vehicleId, 'service-records', id]    # one record (embeds parts)
```

Mutations also invalidate `['vehicles', vehicleId, 'mileage']` and
`['vehicles', vehicleId, 'expenses']`.

### Request / response shapes

- `ServiceRecordSchema`, `ServiceRecordCreateSchema`, `ServiceRecordUpdateSchema`,
  `ServicePartLineSchema` from `@carnotea/shared`. Record fields: `serviceDate`,
  `mileage`, `title`, `description`, `laborCost`, `workshopName`. Part-line fields per
  row: `name`, `manufacturer?`, `partNumber?`, `quantity`, `unitPrice`. **`totalCost`
  (record) and `totalPrice` (line) are server-derived** — show as read-only previews,
  never submit.

### Provides

- _n/a_

### Consumes

- `apiClient` write methods (T-033 seam), vehicle-scoped layout (T-033), forms +
  `useFieldArray` (T-031), service+parts API (T-024).

## Acceptance criteria

- [ ] List shows records (date, mileage, title, workshop, total cost) newest first,
      with loading/empty/error.
- [ ] Detail shows record fields plus linked parts (name, mfr/part number, quantity,
      unit price, line total) and the labor/total breakdown.
- [ ] Create/edit use the T-031 form stack; parts are editable inline via a field
      array (add/remove rows); parts subtotal + labor shown against the read-only
      `totalCost`; the server `totalCost >= laborCost` error surfaces.
- [ ] Delete asks for confirmation and notes linked `service_parts` cascade.
- [ ] All reads/writes via TanStack Query + typed client; mutations invalidate the
      service list and dependent expense queries.
- [ ] Every string in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, create with parts, edit, delete); fallback noted.

## Test matrix

Inherits the screens baseline, plus:

| Case                 | Expected                                         |
| -------------------- | ------------------------------------------------ |
| add/remove part rows | field array adds and removes line rows           |
| line total preview   | each row shows `quantity × unitPrice` read-only  |
| record total preview | `laborCost + sum(line totals)` shown read-only   |
| duplicate part 409   | API duplicate-part 409 surfaces as a clear error |
| delete cascade note  | confirm dialog mentions parts cascade            |

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/service/**`
- `apps/web/src/features/service/**`
- `apps/web/src/locales/{pl,en}/service.json`

## Out of scope

- API work for service records and parts (T-024) — typed client consumed as-is.
- A standalone parts catalog/management screen.
- Issues that reference a service record (T-037 owns that link).

## Implementation notes

- Use react-hook-form `useFieldArray` for the parts rows; each row's `totalPrice`
  mirrors `quantity × unitPrice` per the API check (read-only).
- Match the nested-parts shape T-024 exposes (embedded array) in the mutation payload.
- Format currency with the vehicle's `currencyCode`.

## Verification

- `pnpm --filter @carnotea/web test service` → all pass
- `pnpm --filter @carnotea/web dev` → agent-browser exercises list/create-with-parts/edit/delete
- `pnpm --filter @carnotea/web typecheck` → 0 errors

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-033, T-024, T-031, T-011, T-037 (issues link to records)
