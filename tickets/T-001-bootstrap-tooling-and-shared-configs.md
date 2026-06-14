---
id: T-001
title: Bootstrap tooling and shared configs
status: ready
priority: high
owner: ~
dependencies: []
labels: [bootstrap, repo, tooling]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-001 — Bootstrap tooling and shared configs

## Goal

Install the dev tooling the rest of the project depends on (ESLint, Prettier,
shared tsconfig presets, Vitest base config) as separate `tooling/*` workspace
packages so each app/package can extend them with one line.

## Context

The repo already has `pnpm-workspace.yaml` (with a dependency `catalog`),
`turbo.json`, `tsconfig.base.json`, `.editorconfig`, root `package.json` (with
`sherif` wired as `lint:ws` + `postinstall`). What's missing is the actual
shared configuration every later ticket extends.

We keep build-time config in `tooling/*` (not `packages/*`), following the
create-t3-turbo convention: `packages/*` are shippable product libraries,
`tooling/*` are never shipped. See the repo map in `AGENTS.md`.

## Acceptance criteria

- [ ] `tooling/eslint/` exists as `@carnotea/eslint-config`, exporting flat
      configs: `base`, `node`, `react`.
- [ ] `tooling/prettier/` exists as `@carnotea/prettier-config` (default export).
- [ ] `tooling/typescript/` exists as `@carnotea/tsconfig`, exporting
      `base.json`, `node.json`, `react.json` (all extending the root
      `tsconfig.base.json`).
- [ ] A shared Vitest base config is exported (either from `tooling/eslint`'s
      sibling `tooling/vitest/` or documented inline — pick one and note it).
- [ ] Every `tooling/*` package consumes shared versions via `catalog:`
      (e.g. `"eslint": "catalog:"`), not pinned literals.
- [ ] Root scripts `lint`, `lint:fix`, `format`, `format:check`, `typecheck`
      delegate to Turborepo and run clean on a fresh clone (no apps yet → mostly
      no-ops).
- [ ] `pnpm lint:ws` (sherif) passes — no workspace dependency drift.
- [ ] `docs/conventions.md` records any lint rule that overrides defaults.
- [ ] `docs/tech-stack.md` lists the new tooling packages.

## Files to touch

- `tooling/eslint/**`, `tooling/prettier/**`, `tooling/typescript/**`
- `tooling/vitest/**` (if you choose a dedicated package)
- `package.json` (root scripts)
- `turbo.json` (if a new pipeline task is needed)
- `docs/conventions.md`, `docs/tech-stack.md`

## Out of scope

- Husky / lefthook hooks and commitlint (T-013).
- Changesets setup (T-013).
- Scaffolding any app (T-004 for API, T-007 for web).
- Tailwind installation (T-008); we only stub the preset path if needed.
- Turborepo generators (T-016).

## Implementation notes

- ESLint 9 flat config only — no legacy `.eslintrc`.
- Prettier: 100-char width, single quotes, trailing commas everywhere, semicolons.
- `tooling/typescript/react.json` adds `jsx: "react-jsx"` and
  `lib: ["DOM", "DOM.Iterable", "ES2022"]`.
- Naming follows create-t3-turbo: `@carnotea/eslint-config`,
  `@carnotea/prettier-config`, `@carnotea/tsconfig`.
- Add new shared versions to the `catalog` in `pnpm-workspace.yaml` rather than
  pinning them inside each package.

## References

- ADR: [ADR-0001](../docs/adr/0001-monorepo-turborepo.md)
- Conventions: [`docs/conventions.md`](../docs/conventions.md)
- Reference: create-t3-turbo `tooling/` layout.
