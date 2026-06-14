---
id: T-013
title: Tooling — Changesets + Conventional Commits + commitlint
status: ready
priority: low
owner: ~
dependencies: [T-001]
labels: [tooling, repo]
created_at: 2026-06-13
updated_at: 2026-06-13
closed_at: ~
---

# T-013 — Tooling: Changesets + Conventional Commits + commitlint

## Goal

Wire up Changesets for versioning, commitlint to enforce Conventional Commits,
and a lightweight git-hooks tool (lefthook preferred) to run lint and
commitlint on commit.

## Context

We use Conventional Commits per `docs/conventions.md`. Enforcement makes the
convention real. Changesets gives us a per-package CHANGELOG and a release
flow we can lean on if we ever publish anything (even just internal Docker
image tags).

## Acceptance criteria

- [ ] `@changesets/cli` initialized at the repo root; `pnpm changeset` works.
- [ ] `commitlint` config follows `@commitlint/config-conventional`.
- [ ] `lefthook.yml` (or `.husky/`) runs: - `pre-commit`: `pnpm lint --filter ...[HEAD]` on changed packages, - `commit-msg`: `pnpm commitlint --edit "$1"`.
- [ ] CI is not required for this ticket — the hooks are enough.
- [ ] `docs/conventions.md` "Commits" section is augmented with the exact
      `type(scope): subject` shapes that commitlint accepts.
- [ ] `docs/tech-stack.md` lists the new tools.

## Files to touch

- `package.json` (devDependencies and scripts)
- `lefthook.yml` (or `.husky/**`)
- `commitlint.config.cjs`
- `.changeset/**`
- `docs/conventions.md`, `docs/tech-stack.md`

## Out of scope

- Auto-publishing packages to npm — none of our packages are public.
- A release pipeline / GitHub Action.

## Implementation notes

- `lefthook` is faster than husky on Windows and simpler to configure. Pick
  it unless there's a reason not to.
- For commitlint scopes, allow at minimum: `api`, `web`, `db`, `shared`,
  `repo`, `docs`, `tickets`, `adr`, `config`, plus feature names as they
  emerge.

## References

- <https://github.com/changesets/changesets>
- <https://commitlint.js.org>
- <https://github.com/evilmartians/lefthook>
