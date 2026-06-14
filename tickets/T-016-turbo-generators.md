---
id: T-016
title: Turborepo generators — scaffold new packages
status: ready
priority: low
owner: ~
dependencies: [T-001]
labels: [tooling, dx, repo]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-016 — Turborepo generators: scaffold new packages

## Goal

Add a `turbo gen` generator that scaffolds a new workspace package (or tooling
package) with the standard `package.json`, `tsconfig.json`, ESLint config, and
`src/index.ts`, wired to the shared presets — so agents create consistent
packages without copy-paste.

## Context

This repo is built by agents who will create new packages over time. A generator
makes every new package start from the same skeleton (correct name scope,
`catalog:` references, extends `@carnotea/tsconfig`, etc.), which keeps the
monorepo consistent and `sherif`-clean. create-t3-turbo uses exactly this
pattern (`turbo/generators` + Plop templates).

## Acceptance criteria

- [ ] `turbo/generators/config.ts` defines an `init` generator that prompts for
      a package name (auto-stripping the `@carnotea/` prefix) and optional
      dependencies.
- [ ] Templates exist for `package.json`, `tsconfig.json`, ESLint config, and a
      minimal `src/index.ts`.
- [ ] Generated `package.json` extends the shared presets and uses `catalog:`
      for shared deps; generated tsconfig extends `@carnotea/tsconfig`.
- [ ] `pnpm turbo gen init` (or a root `pnpm gen` script) scaffolds a package
      that immediately passes `pnpm lint:ws`, `pnpm typecheck`, and `pnpm build`.
- [ ] The generator runs `pnpm install` and formats the new files afterward.
- [ ] A short "scaffolding a new package" section is added to
      `docs/getting-started.md`.

## Files to touch

- `turbo/generators/config.ts`
- `turbo/generators/templates/**`
- `package.json` (a `gen` script, optional)
- `docs/getting-started.md`

## Out of scope

- A feature-module generator (API resource + web feature + schema) — that's a
  richer generator worth its own ticket once the app shape is known.
- Generating apps (`apps/*`); those are scaffolded by their own tickets.

## Implementation notes

- `@turbo/gen` uses Plop under the hood; templates are Handlebars `.hbs`.
- Mirror create-t3-turbo's generator: it fetches `latest` for named deps and
  writes them in, then runs install + prettier.
- Default the new package to `tooling/` vs `packages/` based on a prompt, or
  ship two generators — keep it simple, one prompt is fine.

## References

- ADR: [ADR-0001](../docs/adr/0001-monorepo-turborepo.md)
- Reference: create-t3-turbo `turbo/generators/config.ts`.
