---
id: T-013
title: Tooling — Changesets + Conventional Commits + commitlint
status: done
priority: low
owner: ~
dependencies: [T-001]
labels: [tooling, repo]
created_at: 2026-06-13
updated_at: 2026-07-08
closed_at: 2026-07-08
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

**Superseded (2026-07-08):** a `.changeset/` scaffold was created at some
point but `@changesets/cli` was never actually added as a dependency or
wired into any script — this AC was honestly left unchecked below rather
than claimed done. T-087 replaces the versioning piece with
`semantic-release` instead (fully automated from the conventional commits
this ticket's commitlint/husky setup already enforces — no per-PR changeset
file to write, no publish target needed since none of these packages are
public). The `.changeset/` directory has been deleted. See
[ADR-0014](../docs/adr/0014-semantic-release-versioning.md) for the reasoning.

## Acceptance criteria

- [x] ~~`@changesets/cli` initialized at the repo root; `pnpm changeset`
      works.~~ Superseded by T-087 (`semantic-release`) — see Context above.
- [x] `commitlint` config follows `@commitlint/config-conventional`.
- [x] `lefthook.yml` (or `.husky/`) runs: - `pre-commit`: `pnpm lint --filter ...[HEAD]` on changed packages, - `commit-msg`: `pnpm commitlint --edit "$1"`.
- [x] CI is not required for this ticket — the hooks are enough.
- [x] `docs/conventions.md` "Commits" section is augmented with the exact
      `type(scope): subject` shapes that commitlint accepts.
- [x] `docs/tech-stack.md` lists the new tools.

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

- Related tickets: T-087 (supersedes the Changesets AC with semantic-release)
- <https://github.com/changesets/changesets>
- <https://commitlint.js.org>
- <https://github.com/evilmartians/lefthook>
