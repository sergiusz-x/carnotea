---
id: T-087
title: Automated SemVer releases via semantic-release
status: in_progress
priority: medium
size: S
spec_version: 1
owner: claude
dependencies: [T-013]
labels: [tooling, ci, repo]
created_at: 2026-07-08
updated_at: 2026-07-08
closed_at: ~
---

# T-087 — Automated SemVer releases via semantic-release

## Goal

Every push to `main` that contains a releasable Conventional Commit
automatically produces a SemVer git tag and a GitHub Release, with zero
manual per-release steps — starting at `v1.0.0` for this app's first
production launch.

## Context

CarNotea shipped live with no version history anywhere: no git tags, no
GitHub Releases, `package.json` stuck at `0.0.0`. An earlier same-day
attempt (T-046) to get GitHub-visible **deploy status** (via Dokploy's API)
was dropped — too much one-time manual ceremony (API keys, Cloudflare
Access) for the payoff. This ticket is a separate, much smaller ask: just a
visible version marker, not deploy status, and it must need zero manual
ceremony per release.

`tickets/T-013-tooling-changesets-commitlint.md` had scaffolded Changesets
for this exact purpose but never finished wiring it up (`@changesets/cli`
was never installed) — see that ticket's 2026-07-08 update. Changesets also
requires a manual `pnpm changeset` step per PR, which conflicts with the
"zero ceremony" requirement here. See
[ADR-0014](../docs/adr/0014-semantic-release-versioning.md) for the full
decision and alternatives considered.

## Contract

_n/a — this is a CI/tooling ticket, not an API/web resource. No routes or
schemas involved._

### Endpoints / routes

_n/a_

### Request / response shapes

_n/a_

### Provides

- A `release` job in `.github/workflows/ci.yml` that any future ticket can
  rely on: merging a `feat`/`fix` commit to `main` always results in a new
  git tag + GitHub Release, no extra action needed.

### Consumes

- Conventional Commit enforcement from T-013 (`commitlint.config.cjs`,
  `commit-msg` husky hook) — this ticket adds no new commit-message rules,
  just acts on the ones already enforced.

## Acceptance criteria

- [x] `semantic-release` + `@semantic-release/commit-analyzer` +
      `@semantic-release/release-notes-generator` + `@semantic-release/github`
      added as root devDependencies; `release.config.js` configures
      `branches: ['main']` with those three plugins only (no
      `@semantic-release/git`, no `@semantic-release/changelog` — tag-only,
      never pushes to `main`).
- [x] `.github/workflows/ci.yml` has a `release` job: `needs:` all other CI
      jobs, runs only on `push` to `main`, `permissions: contents: write`,
      `fetch-depth: 0` checkout, runs `npx semantic-release` with the
      default `secrets.GITHUB_TOKEN` (no new secret).
- [x] The abandoned `.changeset/` directory is removed.
- [x] `docs/release-process.md` documents the whole flow (commit-type →
      bump mapping, first release is always `1.0.0`, tags/Releases are the
      source of truth not `package.json`, what this does _not_ do).
- [x] `docs/conventions.md`'s stale "Triggers a major version bump in
      changesets" line is corrected.
- [x] `AGENTS.md`'s Task Router links to `docs/release-process.md`.
- [x] `docs/tech-stack.md` and `tickets/T-013-...md` reflect the tool
      change (Changesets row → semantic-release row; T-013's changesets AC
      marked superseded, not silently left unchecked).
- [ ] **Live verification**: after merging to `main`, the `release` job
      actually creates git tag `v1.0.0` and a GitHub Release titled `v1.0.0`
      with generated notes, visible in the repo's Releases sidebar.

## Test matrix

_No app code changed — nothing for `pnpm test` to cover. Verification is
config validity + one live CI run, listed below._

| Case                        | Input                        | Expected                                                                   |
| --------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| YAML validity               | `.github/workflows/ci.yml`   | parses, `release` job present with correct `needs`                         |
| First live run on `main`    | merge this PR                | `release` job creates tag `v1.0.0` + a GitHub Release                      |
| Non-releasable commit alone | a `docs:`/`chore:`-only push | `release` job runs, semantic-release exits with no new tag (not a failure) |

## Files to touch

- `package.json` (devDependencies)
- `release.config.js` (new)
- `.github/workflows/ci.yml`
- `.changeset/` (deleted)
- `docs/release-process.md` (new)
- `docs/conventions.md`, `docs/tech-stack.md`
- `docs/adr/0014-semantic-release-versioning.md` (new), `docs/adr/README.md`
- `AGENTS.md`
- `tickets/T-013-tooling-changesets-commitlint.md`

## Out of scope

- Reporting deploy success/failure to GitHub — dropped per T-046; a version
  tag says nothing about what's actually running in production.
- Keeping `package.json` `"version"` fields or a `CHANGELOG.md` in sync —
  deliberately not done to avoid the release job needing to push to `main`
  (see ADR-0014, Option C).
- Per-package independent versioning — this is one deployed app, one
  version; not a multi-package publishing setup.

## Implementation notes

- Confirmed `@semantic-release/commit-analyzer`'s default preset is
  `angular` (verified in its README, not assumed): `feat`→minor,
  `fix`/`perf`/`revert`→patch, others→no release unless a
  `BREAKING CHANGE:` footer forces major — matches the type table already
  in `docs/conventions.md` exactly.
- Package versions confirmed via `pnpm info` on 2026-07-08 per AGENTS.md's
  dependency-freshness rule: `semantic-release@25.0.5`,
  `@semantic-release/commit-analyzer@13.0.1`,
  `@semantic-release/release-notes-generator@14.1.1`,
  `@semantic-release/github@12.0.9`.
- Also fixed an unrelated, adjacent oversight found while touching
  `docs/adr/README.md`: its index table was missing a row for the already-
  accepted ADR-0013.

## Verification

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`,
  `pnpm lint:tickets` → all pass.
- `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'))"` → parses without error.
- Post-merge: watch the Actions run for `main`, confirm `release` job
  succeeds and `git tag -l` / `gh release list` shows `v1.0.0`.

## References

- ADR: [ADR-0014](../docs/adr/0014-semantic-release-versioning.md)
- Related tickets: T-013 (superseded Changesets AC), T-046 (dropped
  deploy-status attempt, same day)
- External: <https://semantic-release.gitbook.io/>,
  <https://github.com/semantic-release/commit-analyzer>
