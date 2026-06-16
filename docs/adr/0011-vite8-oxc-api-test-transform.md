# ADR-0011: Vite 8 across the monorepo; native Oxc for API test transform

- **Status**: accepted
- **Date**: 2026-06-16
- **Deciders**: Sergiusz, Claude
- **Related tickets**: T-004, T-007, T-008
- **Amends**: [ADR-0010](./0010-api-compiler-swc.md) (the test-transform part only)

## Context

[ADR-0010](./0010-api-compiler-swc.md) chose **SWC** as the `apps/api`
compiler because the esbuild transform used by Vitest does not emit
`emitDecoratorMetadata`, which NestJS dependency injection needs. To give tests
the same decorator semantics as the build, Vitest was wired to `unplugin-swc`.
As a consequence the catalog pinned `vite: ^7.3.5`, because `unplugin-swc@1.5.9`
does not support Vite 8's Oxc transform pipeline (it sets `esbuild: false`,
which is a no-op under Vite 8 and emits a warning).

The web app (T-007 scaffold, T-008 Tailwind/shadcn) targets Vite 8 and
`@vitejs/plugin-react@6`, which requires `vite ^8`. The monorepo shares one
`vite` version through the catalog, so web and api cannot diverge: either the
whole repo stays on Vite 7, or it moves to Vite 8 and the api stops relying on
`unplugin-swc`.

Vite 8 transforms TypeScript with **Oxc**, which now natively supports legacy
experimental decorators **and** `emitDecoratorMetadata`. This removes the reason
`unplugin-swc` existed in the test pipeline.

## Decision

Move the catalog to **`vite: ^8.0.16`** (latest) repo-wide and configure the
api's Vitest to transform with **native Oxc** instead of `unplugin-swc`:

```ts
// apps/api/vitest.config.ts
oxc: {
  decorator: { legacy: true, emitDecoratorMetadata: true },
}
```

`unplugin-swc` is removed from `apps/api` devDeps and from the catalog. The
api **build pipeline is unchanged** — `nest build` still uses `@swc/cli` /
`.swcrc`, so the core of ADR-0010 (SWC as the api compiler) still stands. Only
the test-time transform changes.

## Consequences

### Positive

- One transformer fewer in the test pipeline; `unplugin-swc` dependency dropped.
- The Vite 8 `esbuild: false` no-op warning is gone.
- The whole repo runs the latest Vite.

### Negative

- Test transform (Oxc) and build transform (SWC) now differ. Both emit
  `design:paramtypes`, so type-based DI works in both; verified with a Nest
  `Test.createTestingModule` resolving a by-type constructor dependency. If a
  future Oxc/SWC divergence in decorator emit surfaces, this is where to look.

### Neutral

- The change is scoped to `apps/api/vitest.config.ts` and the shared catalog.

## Alternatives considered

### Option A: stay on Vite 7, keep `unplugin-swc`

Rejected. It would force the web app onto Vite 7 + `@vitejs/plugin-react@5`,
i.e. holding the whole repo back from the latest Vite to preserve a transform
plugin Vite 8 makes unnecessary.

### Option B: keep `unplugin-swc` on Vite 8

Rejected. It works (tests pass) but logs the `esbuild: false` no-op warning on
every run and keeps a dependency that native Oxc replaces.
