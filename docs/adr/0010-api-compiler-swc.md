# ADR-0010: SWC as the apps/api compiler

- **Status**: accepted
- **Date**: 2026-06-14
- **Deciders**: Sergiusz, Claude
- **Related tickets**: T-004

## Context

`apps/api` is a NestJS application. NestJS relies on `emitDecoratorMetadata` at
runtime so its dependency-injection container can resolve constructor
parameters by type. The monorepo is pure ESM (`"type": "module"` everywhere,
`tsconfig` `moduleResolution: NodeNext`).

The default esbuild transform used by `tsx` and by Vitest does **not** emit
decorator metadata, which breaks type-based DI and makes NestJS tests unable to
construct providers. We therefore need a compiler that emits decorator metadata
and produces ESM output, for both the dev/build pipeline and the test runner.

## Decision

We will compile `apps/api` with **SWC**, driven through `@nestjs/cli`
(`nest start --watch` for dev, `nest build` for build), configured by a local
`.swcrc` that enables `legacyDecorator` + `decoratorMetadata` and emits ES
modules. Vitest uses the same SWC transform via `unplugin-swc` so tests share
the runtime's decorator semantics. SWC is NestJS's officially recommended fast
compiler and is scoped to `apps/api` — it is not a repo-wide build tool change.

## Consequences

### Positive

- Decorator metadata is emitted consistently in dev, build, and test, so
  type-based DI and NestJS testing utilities work without `@Inject` workarounds.
- SWC builds and hot-reloads are fast.
- `nest-cli.json` keeps the dev/build commands idiomatic for NestJS.

### Negative

- Adds `@swc/core`, `@nestjs/cli`, and `unplugin-swc` to `apps/api` devDeps.
- SWC does type-erasure only; type errors are caught by `tsc --noEmit`
  (`typecheck`) and by `nest build`'s `typeCheck` option, not by the emit step.

### Neutral

- The compiler choice is local to `apps/api`; other packages keep using `tsc`.

## Alternatives considered

### Option A: tsc via @nestjs/cli

Rejected for now. `tsc` emits decorator metadata correctly, but the NestJS CLI's
tsc watch path has historically been less reliable for pure-ESM packages than
the SWC builder.

### Option B: node --watch + @swc-node/register

Rejected. It avoids `@nestjs/cli` but hand-wires the dev loader and build step,
adding more bespoke tooling to maintain for no real gain over the CLI.

### Option C: tsx / esbuild

Rejected. esbuild does not emit decorator metadata, which breaks NestJS
type-based dependency injection.
