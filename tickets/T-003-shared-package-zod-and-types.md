---
id: T-003
title: Shared package — Zod schemas and types
status: ready
priority: high
owner: ~
dependencies: [T-001]
labels: [bootstrap, shared]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-003 — Shared package: Zod schemas and types

## Goal

Create `packages/shared` as the home for Zod schemas, inferred TypeScript types,
and shared constants used by both the API and the web client.

## Context

ADR-0003 picks Zod as the validation tool and OpenAPI as the contract. The
schemas need a single physical home so neither the API nor the web client
imports across app boundaries. This package provides that home.

It is empty of domain schemas at first — only the skeleton, the build
toolchain, and a few constants derived from the SQL seeds (fuel type codes,
expense category codes, etc.).

## Acceptance criteria

- [ ] `packages/shared/` exists as `@carnotea/shared`.
- [ ] It exports:
      - `constants/fuel-types.ts` (string-literal union mirroring the SQL seed),
      - `constants/issue-statuses.ts`,
      - `constants/issue-priorities.ts`,
      - `constants/reminder-statuses.ts`,
      - `constants/charger-types.ts`,
      - `constants/expense-categories.ts`,
      - `schemas/index.ts` (exports the schemas, currently empty placeholder),
      - `index.ts` (re-export entry point).
- [ ] All constants are exported as `as const` arrays plus inferred union
      types (e.g. `type FuelTypeCode = (typeof FUEL_TYPE_CODES)[number]`).
- [ ] tsconfig extends `@carnotea/tsconfig/base.json`.
- [ ] `pnpm --filter @carnotea/shared build` succeeds.
- [ ] `docs/tech-stack.md` "Shared (packages/shared)" section is accurate.

## Files to touch

- `packages/shared/**`
- `docs/tech-stack.md`

## Out of scope

- Any domain schema (vehicle, fuel-log, service-record, etc.) — those live in
  feature tickets, not this scaffold.
- OpenAPI generation helpers (T-005).

## Implementation notes

- Don't re-derive constants from the database at build time. The SQL is the
  authority for what gets inserted; the TS constants are the authority for what
  the application *expects*. They must match — that's enforced by integration
  tests later.
- Keep the package zero-runtime-deps for now (except `zod`).
- Use `tsup` or plain `tsc --build` — pick the simpler option (`tsc --build`).

## References

- ADR: [ADR-0003](../docs/adr/0003-rest-openapi-zod.md)
- Existing seeds: `sql/07_seed_data.sql`
