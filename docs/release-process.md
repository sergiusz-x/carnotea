# Release process

CarNotea version tags and GitHub Releases are generated **automatically** by
[semantic-release](https://semantic-release.gitbook.io/) from the
Conventional Commits already required by
[`docs/conventions.md`](./conventions.md). There is nothing to configure or
click per release — if you write commits the way this repo already requires,
versioning happens for free.

## How it works

On every push to `main` (after `lint`, `format`, `typecheck`, `test`,
`build`, and `audit` all pass — see the `release` job in
`.github/workflows/ci.yml`), `npx semantic-release` runs and:

1. Reads every commit merged to `main` since the last release tag.
2. Determines the next version from each commit's `type` (via the
   `conventional-changelog-angular` preset, semantic-release's default):

   | Commit type                                        | Bump                  |
   | -------------------------------------------------- | --------------------- |
   | `feat`                                             | minor (`1.x.0`)       |
   | `fix`, `perf`, `revert`                            | patch (`1.2.x`)       |
   | `docs`, `refactor`, `test`, `chore`, `ci`, `build` | no release on its own |
   | any type with a `BREAKING CHANGE:` footer          | major (`x.0.0`)       |

   (Same type list `docs/conventions.md` already documents for commitlint —
   nothing new to learn.)

3. If nothing releasable happened (only `docs`/`chore`/etc. commits since
   the last release), semantic-release exits without creating anything —
   this is normal, not a failure.
4. Otherwise it creates a git **tag** (`v1.2.3`) and a **GitHub Release**
   with auto-generated notes grouping commits by type, visible in the
   repo's **Releases** sidebar.

**The very first release is always `1.0.0`**, regardless of prior commit
history — semantic-release's documented default behavior when no matching
tag exists yet. So merging the PR that adds this workflow produces `v1.0.0`
on its first run: the "we shipped this live" marker.

## What this does _not_ do

- **No deploy-status reporting.** This is unrelated to whether Dokploy's
  deploy actually succeeded — see `docs/deployment.md` for how deploys work.
  A version tag means "this code was merged and released," not "this
  version is confirmed running in production."
- **No `CHANGELOG.md` file and no `package.json` version bump.** The release
  job never pushes anything back to `main` (git tags aren't branch pushes,
  so they're unaffected by branch protection — a commit-back would be).
  The git tag + GitHub Release **are** the version record; every
  `package.json` `"version"` field in this repo stays at `0.0.0` and should
  be read as "not the real version" — check the Releases tab or
  `git describe --tags` instead.
- **No manual changeset file per PR.** An earlier, abandoned attempt
  scaffolded [Changesets](https://github.com/changesets/changesets)
  (see `tickets/T-013-tooling-changesets-commitlint.md`) but never finished
  wiring it up. semantic-release was chosen instead specifically to avoid
  that per-PR manual step — see
  [ADR-0014](./adr/0014-semantic-release-versioning.md) for the full
  reasoning.

## Checking the current live version

```bash
git describe --tags --abbrev=0   # latest release tag reachable from HEAD
gh release view --repo sergiusz-x/carnotea   # latest GitHub Release + notes
```

## For agents

Nothing extra to do beyond writing correctly-typed Conventional Commits,
which is already mandatory. Do not manually create git tags, edit
`package.json` `"version"` fields, or add changeset files — none of that is
part of this flow.
