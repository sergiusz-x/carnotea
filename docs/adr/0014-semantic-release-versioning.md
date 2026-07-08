# ADR-0014: semantic-release for SemVer tags + GitHub Releases

- **Status**: accepted
- **Date**: 2026-07-08
- **Deciders**: @sergiusz-x
- **Related tickets**: T-087, T-013 (superseded), T-046 (related, deploy-status attempt dropped)

## Context

CarNotea went live on `carnotea.sergiusz.dev` (via Dokploy) with no visible
version history anywhere — no git tags, no GitHub Releases, `package.json`
`"version"` stuck at `0.0.0` everywhere. A prior attempt this same day to
give GitHub visibility into _deploy_ success/failure (T-046, calling
Dokploy's API and reporting a GitHub Deployment status) was dropped: it
required a one-time manual ceremony (Dokploy API key, Cloudflare Access
Service Token + policy, new GitHub secrets) that wasn't worth the payoff for
this project.

Separately, `tickets/T-013-tooling-changesets-commitlint.md` had already
scaffolded [Changesets](https://github.com/changesets/changesets) for
versioning (`.changeset/config.json` + one stray changeset file existed in
the repo) but `@changesets/cli` was never actually added as a dependency or
wired into any script — an abandoned, half-finished setup. Changesets'
model also requires an explicit `pnpm changeset` step per PR (author picks a
bump type and writes a summary by hand) — exactly the kind of manual,
per-change ceremony this project is trying to avoid after the T-046
experience.

Conventional Commits are already mandatory in this repo
(`commitlint.config.cjs` → `@commitlint/config-conventional`, enforced via
the `commit-msg` husky hook per T-013) and `docs/conventions.md` already
documents the exact type/scope table and a `BREAKING CHANGE:` footer
convention. This is enough information to compute a SemVer version with zero
additional human input.

## Decision

We will use [`semantic-release`](https://semantic-release.gitbook.io/) in a
**tag-only** configuration (`@semantic-release/commit-analyzer`,
`@semantic-release/release-notes-generator`, `@semantic-release/github`
only — no `@semantic-release/git`, no `@semantic-release/changelog`) to
automatically compute the next SemVer version from commits merged to `main`
since the last release, and create a git tag + GitHub Release with generated
notes. It runs as a `release` job in `.github/workflows/ci.yml`, gated on all
other CI jobs passing, only on `push` to `main`, using the default
`secrets.GITHUB_TOKEN` — no new secrets, no external service, nothing to
configure in any dashboard.

## Consequences

### Positive

- Zero per-PR ceremony: no changeset file, no manual tag, no dashboard
  clicks. Works entirely from commits already required by
  `docs/conventions.md`.
- The first release on merge is automatically `1.0.0` (semantic-release's
  documented default when no prior tag exists) — exactly the "we shipped
  this live" marker wanted, with no manual bootstrap tag needed.
- Tag-only mode means the `release` job never pushes to `main` (only creates
  a tag, a different ref class from a branch push), so it can never conflict
  with `main`'s branch protection rules.
- Uses the default `GITHUB_TOKEN` — no new credential surface at all, unlike
  the dropped T-046 Dokploy-API approach.

### Negative

- `package.json` `"version"` fields are **not** kept in sync with the
  released version (no commit-back plugin) — the git tag / GitHub Release
  is the sole source of truth. Documented explicitly in
  `docs/release-process.md` to avoid future confusion.
- No committed `CHANGELOG.md` file — release notes only live on GitHub's
  Releases page, not in the repo itself. Acceptable since this isn't a
  published package anyone greps a CHANGELOG for.
- A version tag says nothing about whether that version is actually running
  in production (that's a separate, currently-unsolved concern — see
  `docs/deployment.md` and T-046's notes on the dropped deploy-status idea).

### Neutral

- Non-releasable commits (`docs`, `chore`, `refactor`, `test`, `ci`, `build`
  with no `BREAKING CHANGE:`) simply produce no release when pushed alone —
  expected semantic-release behavior, not a failure.

## Alternatives considered

### Option A: Finish the abandoned Changesets scaffold

Would honor T-013's original intent, but requires a manual `pnpm changeset`
step on every PR that should trigger a release — the team explicitly wants
to avoid manual per-change ceremony after the T-046 experience. Changesets
is also designed for independently-versioned published packages; this repo
is one deployed app with a single meaningful version, which semantic-release
already models by default without extra configuration (fixed/linked package
groups).

### Option B: Manual git tags

Simplest possible option (`git tag v1.2.3 && git push --tags` by hand after
deciding a version bump). Rejected: entirely manual, easy to forget, no
generated release notes, and defeats the goal of agents/humans never having
to think about versioning as a separate step.

### Option C: semantic-release with `@semantic-release/git` (commit back to `main`)

Would keep `package.json` `"version"` and a `CHANGELOG.md` in sync
automatically. Rejected for now: requires the release job to push a commit
directly to `main`, which conflicts with branch protection unless the
default token is explicitly exempted from "require a pull request" rules —
an extra repo-settings dependency this decision deliberately avoids. Tags
alone satisfy the actual goal (a visible SemVer marker per release).
