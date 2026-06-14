# ADR-0001: Monorepo with pnpm workspaces and Turborepo

- **Status**: accepted
- **Date**: 2026-06-13
- **Deciders**: Sergiusz, Claude

## Context

CarNotea has at least three distinct deliverables that share types and domain
logic: the API, the web client, and the database schema. We expect a fourth
package (`shared`) to hold Zod schemas and TypeScript types reused by both
runnable apps.

We could split each deliverable into its own repository, but then we would need
external versioning between them for what is essentially one product, owned by
one person, with one release cadence.

The project will be built primarily by AI agents. Agents work better when the
full context is in one tree: one `git clone`, one `pnpm install`, one set of
docs, one ticket system.

## Decision

We use a single repository with **pnpm workspaces** for package management and
**Turborepo** for task orchestration and caching. The layout is:

```
apps/        # runnable apps
packages/    # libraries shared between apps
tooling/     # build-time helpers (reserved; empty for now)
```

## Consequences

### Positive

- One PR can change the API, web client, and shared types atomically.
- Agents see the whole project context at once.
- Turborepo's task graph plus remote caching keeps CI fast as the repo grows.
- pnpm's content-addressed store keeps `node_modules` small and predictable.

### Negative

- Slightly higher learning curve for people new to pnpm or Turborepo.
- Lockfile churn on shared dependencies; we tolerate it.

### Neutral

- Turborepo brings remote caching that we may or may not enable; the choice is
  separate from this ADR.

## Alternatives considered

### Option A: Polyrepo (api repo + web repo + shared npm package)

Rejected. Adds release ceremony for the shared package, makes type changes
require two PRs in lock-step, and splits the ticket system between repos.

### Option B: Nx instead of Turborepo

Rejected for now. Nx is more featureful but also more opinionated and harder to
reason about. We can revisit if the build graph becomes complex enough to need
it.

### Option C: Plain pnpm workspaces without Turborepo

Rejected. Without a task runner the dev loop fragments quickly (each package
needs its own scripts and there's no caching). Turborepo is cheap to adopt and
trivial to remove later.
