---
id: T-036
title: Web service-record screens with linked parts
status: ready
priority: medium
owner: ~
dependencies: [T-033, T-024]
labels: [web, feature]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-036 — Web service-record screens with linked parts

## Goal

Let a user view, add, edit, and delete service records for a vehicle, including
the parts attached to each record, driven by TanStack Query against the typed
client.

## Context

Service records capture workshop visits and repairs and aggregate labor plus
parts into a total cost that feeds expenses. Each record can reference one or
more parts via the `service_parts` join. They hang off the vehicle hub (T-033)
and consume the combined service+parts API from T-024.

## Acceptance criteria

- [ ] `/vehicles/:vehicleId/service` lists service records (date, mileage, title,
      workshop, total cost) newest first, with loading, empty, and error states.
- [ ] A detail view shows one record's fields plus its linked parts (name,
      manufacturer/part number, quantity, unit price, line total) and the
      labor/total cost breakdown.
- [ ] Create and edit use the T-031 form stack with the shared Zod service
      schema: serviceDate, mileage, title, description, laborCost, totalCost,
      workshopName.
- [ ] Linked parts are editable inline (add/remove rows, each with quantity and
      unit price); the parts subtotal plus labor is shown against `totalCost`,
      and the server check (`totalCost >= laborCost`) error surfaces.
- [ ] Delete asks for confirmation and notes that linked `service_parts` cascade.
- [ ] All reads/writes go through TanStack Query + the typed client; mutations
      invalidate the service list and dependent expense queries.
- [ ] Every user-facing string exists in both `pl` and `en`; no hardcoded JSX.
- [ ] Verified in agent-browser (list, create with parts, edit, delete). If
      Chrome is blocked, fall back to documented structural verification and note it.

## Files to touch

- `apps/web/src/routes/vehicles/$vehicleId/service/**`
- `apps/web/src/features/service/**` (records + parts components, hooks, queries)
- `apps/web/src/locales/pl/service.json`, `apps/web/src/locales/en/service.json`

## Out of scope

- API work for service records and parts (T-024) — typed client consumed as-is.
- A standalone parts catalog/management screen — parts are attached within a
  service record here only.
- Issues that reference a service record (T-037 owns that link).

## Implementation notes

- Use a field array (react-hook-form `useFieldArray`) for the parts rows; each
  row's `totalPrice` mirrors `quantity × unitPrice` per the API check.
- Follow whatever shape T-024 exposes for nested parts (embedded array vs.
  separate sub-resource) and match it in the mutation payload.
- Format currency with the vehicle's `currencyCode`.

## References

- Related tickets: T-033 (vehicle hub), T-024 (API service+parts), T-031 (forms),
  T-011 (typed client), T-037 (issues link to service records)
