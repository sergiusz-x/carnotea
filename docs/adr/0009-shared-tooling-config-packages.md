# ADR-0009: Shared tooling config packages

- **Status**: accepted
- **Date**: 2026-06-14
- **Deciders**: Sergiusz, Codex
- **Related tickets**: T-001

## Context

Every app and package in the monorepo needs the same baseline for linting,
formatting, TypeScript, and unit/integration tests. Without shared configs, each
new workspace package would copy local setup and drift over time.

The repository already uses pnpm workspaces and Turborepo. ADR-0001 reserves
`tooling/` for build-time helpers that are not shipped as product libraries.

## Decision

Use private workspace packages under `tooling/*` for shared development
configuration: `@carnotea/eslint-config`, `@carnotea/prettier-config`,
`@carnotea/tsconfig`, and `@carnotea/vitest-config`. Keep external tool versions
in the pnpm catalog and make apps/packages consume these config packages instead
of duplicating local config.

## Consequences

### Positive

- New apps/packages can extend repo defaults with a small config file.
- Version drift is easier to catch because external tooling versions live in the
  pnpm catalog.
- Lint, format, typecheck, test, and build commands can be orchestrated through
  Turborepo consistently.

### Negative

- Updating a shared config can affect many packages at once.
- Tooling packages add some workspace overhead before the first app exists.

### Neutral

- The config packages are private and build-time only; they do not become
  runtime dependencies of the product.

## Alternatives considered

### Option A: Root-only config files

Rejected. Root-only configs work for the first package, but package-specific
extensions become ad hoc as soon as API, web, DB, and shared packages need
slightly different environments.

### Option B: Copy config into each app/package

Rejected. Copying is simple initially, but it creates dependency and rule drift
that agents would need to reconcile repeatedly.
