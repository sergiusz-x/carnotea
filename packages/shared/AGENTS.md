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
