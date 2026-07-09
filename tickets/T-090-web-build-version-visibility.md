---
id: T-090
title: Show deployed web build version and release metadata
status: in_progress
priority: high
size: M
spec_version: 1
owner: codex
dependencies: [T-012, T-087]
labels: [web, deploy, release, ux]
created_at: 2026-07-09
updated_at: 2026-07-09
closed_at: ~
---

# T-090 — Show deployed web build version and release metadata

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Expose the currently deployed web build version in the UI so a user can refresh
the app and tell whether Dokploy has rolled out the new build yet.

## Context

CarNotea already versions releases automatically via semantic-release tags and
GitHub Releases, and Dokploy already auto-deploys every push to `main`. What is
missing is a trustworthy in-app signal that the browser is serving the newly
deployed frontend build rather than a previous one.

Because Dokploy builds directly from the pushed `main` commit while
semantic-release creates the git tag shortly afterwards in GitHub Actions, the
web app cannot wait for a post-build manual value. The build metadata therefore
has to be derived automatically from the checked-out git history available at
build time, in the same release model the repo already uses.

## Contract

No API contract changes. The web build emits a static `version.json` file and
the UI shows a visible build badge derived from build-time git metadata:

- `displayVersion`: `<release-version>+build.<short-sha>`
- `releaseVersion`: latest tagged release visible to the build (or the computed
  next release version when the current commit is releasable)
- `commitSha` / `shortCommitSha`
- `builtAt`

### Endpoints / routes

| Method | Path            | Auth  | Success                 | Errors |
| ------ | --------------- | ----- | ----------------------- | ------ |
| GET    | `/version.json` | _n/a_ | 200 build metadata JSON | 404    |
| Web    | app shell       | _n/a_ | visible version badge   | _n/a_  |

### Request / response shapes

- `version.json` is a static JSON object emitted by the web build. No shared
  schema is added; the shape is local to the web app and documented here.

### Provides

- A visible version badge in the web shell.
- A static `/version.json` artifact for debugging and deploy verification.

### Consumes

- Git tags and commit messages already used by semantic-release.
- Dokploy's existing auto-deploy of `main`.

## Acceptance criteria

- [ ] The authenticated web shell shows a visible build badge whose value
      changes after a new deploy reaches the browser.
- [ ] The web build emits `/version.json` with version, commit SHA, and build
      timestamp, and nginx serves it without cache persistence across refreshes.
- [ ] Refreshing the app after Dokploy finishes a rollout fetches a fresh
      `index.html` and `version.json`, so the visible build badge updates
      without waiting for a hard cache purge.
- [ ] The build metadata is derived automatically from git history and commit
      messages; no manual version bump or committed version file is required.
- [ ] CI builds the web app with enough git history/tags for version derivation.
- [ ] Docs explain what the badge means and how it relates to semantic-release
      versus Dokploy deploy timing.

## Test matrix

| Case                         | Input                           | Expected                                               |
| ---------------------------- | ------------------------------- | ------------------------------------------------------ |
| fix-only commit range        | latest tag + `fix(...)` commits | predicted release bumps patch, badge includes SHA      |
| feat in commit range         | latest tag + `feat(...)` commit | predicted release bumps minor                          |
| docs-only deploy             | latest tag + `docs(...)` commit | release version stays same, build metadata SHA changes |
| `/version.json` request      | production nginx request        | JSON body, no-store cache header                       |
| browser refresh after deploy | reload app after new build      | badge/version JSON reflect the new build metadata      |

## Files to touch

- `apps/web/scripts/compute-build-info.mjs`
- `apps/web/src/lib/build-info.ts`
- `apps/web/src/components/layout/version-badge.tsx`
- `apps/web/src/components/layout/app-shell.tsx`
- `apps/web/src/locales/{en,pl}/common.json`
- `apps/web/vite.config.ts`
- `apps/web/src/vite-env.d.ts`
- `apps/web/nginx.conf`
- `apps/web/Dockerfile`
- `.github/workflows/ci.yml`
- `docs/deployment.md`
- `docs/release-process.md`

## Out of scope

- Changing Dokploy away from its native auto-deploy model.
- Manual release approvals or manually edited version files.
- API endpoints for versioning.

## Implementation notes

- Use git metadata available at build time; do not introduce a hand-maintained
  version file.
- The display value should change on every deploy, even for docs/chore-only
  commits, by including build metadata derived from the current SHA.
- The visible release component should stay aligned with the same commit types
  semantic-release already uses.

## Verification

- `pnpm --filter @carnotea/web lint` → pass
- `pnpm --filter @carnotea/web typecheck` → pass
- `pnpm --filter @carnotea/web test` → pass
- `pnpm --filter @carnotea/web build` → pass
- `pnpm format:check` → pass
- `pnpm lint:tickets` → pass
- `pnpm --filter @carnotea/web dev` + `agent-browser open http://localhost:5173` → badge visible

## References

- ADR: [ADR-0014](../docs/adr/0014-semantic-release-versioning.md)
- Related tickets: T-012, T-087
- Docs: [deployment](../docs/deployment.md), [release process](../docs/release-process.md)
