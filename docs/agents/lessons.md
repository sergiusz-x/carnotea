# Lessons

A running log of corrections. When a human corrects an agent — "no, do it this
way", "you broke X", "we don't do that here" — the agent appends a lesson so the
same mistake doesn't happen twice. This is the repo's memory of its own
mistakes.

## How to use this file

- **One correction → one lesson.** Add it as soon as you're corrected, in the
  same change if possible.
- Write the lesson as a **rule**, not a story. "Always X" / "Never Y" / "When Z,
  do W" — phrased so the next agent can act on it without the backstory.
- If a lesson generalises, promote it: move it into the relevant `AGENTS.md`
  (root or area) and leave a one-line pointer here. `AGENTS.md` is loaded every
  session; this file is read on demand.
- Keep entries dated and short. Prune lessons that became obsolete (the code or
  rule they guarded against is gone).

## Format

```
### YYYY-MM-DD — <short title>

**Context:** what was being done.
**Mistake:** what went wrong.
**Rule:** the durable instruction that prevents a repeat.
```

## Lessons

### 2026-07-08 — A Dockerfile step run as root doesn't help a runtime user who has a different HOME

**Context:** The `migrate` service (`pnpm --filter @carnotea/db db:deploy`, same image as `api`) crashed with `EACCES: permission denied, mkdir '/app/.cache/node/corepack/v1'` the first time it actually ran in production.
**Mistake:** `apps/api/Dockerfile`'s runner stage ran `corepack prepare pnpm@9.12.0 --activate` as root, before `USER carnotea` was set — this cached the prepared package manager into root's home (`/root/.cache/...`), invisible to the `carnotea` user who actually runs commands at container runtime (different `HOME=/app`). Any build-time preparation step that a different runtime user later depends on needs to write somewhere that user can actually read — verify with the runtime user, not just "the build succeeded."
**Rule:** When a Dockerfile switches to a non-root `USER` for runtime, any tool state prepared earlier as root (corepack, caches, generated config) must live under a path explicitly set via env var (e.g. `COREPACK_HOME`) _and_ be chowned to the runtime user — don't assume root's default cache locations carry over. Test the exact runtime command as the exact runtime user, not just that the image builds.

### 2026-07-08 — A profile-gated Compose service needs its profile activated, not just referenced

**Context:** Production had no database schema at all — sign-up failed with `relation "auth_user" does not exist` — despite `docker-compose.prod.yml` having a `migrate` service that runs `drizzle-kit migrate` before `api`/`web` roll out.
**Mistake:** `migrate` has `profiles: [release]`, but nothing ever set `COMPOSE_PROFILES=release` (or passed `--profile release`) in the actual Dokploy deploy command (`docker compose up -d --build --remove-orphans`, no profile flag) — so `migrate` was silently never included in any deploy, ever, since this app was set up on Dokploy. This went unnoticed because every other issue that day (nginx routing, SMTP, Dokploy crashing) got fixed and re-tested before anyone actually tried a real sign-up against a real, fresh Postgres volume.
**Rule:** A Compose service gated by `profiles:` is invisible to `docker compose up` unless something activates that profile — check this explicitly (`docker compose config --profile <name>` or an env var check) rather than assuming a `profiles:` declaration alone means the service runs. If a non-profiled service `depends_on` a profile-gated one, Compose does **not** auto-activate the profile — it hard-fails with "depends on undefined service" instead (verified locally with a minimal repro before relying on this), which is a deliberate, useful fail-loud signal if the profile is ever missing.

### 2026-07-07 — Prefer proven platform-native automation over a hand-rolled integration

**Context:** Building a test-gated deploy trigger for Dokploy from GitHub Actions (T-046).
**Mistake:** Built a custom workflow calling Dokploy's REST API directly (API key + Cloudflare Access Service Token + a guessed `applicationId`) instead of using Dokploy's own native GitHub App auto-deploy. It failed twice in live runs on `main` — a Cloudflare Access path-matching mismatch, then an unverified `applicationId` returning 404 — because both required reverse-engineering undocumented platform internals instead of trusting a feature the platform already proved out.
**Rule:** When a platform (Dokploy, Vercel, etc.) already offers a native mechanism for something (auto-deploy on push), prefer it over building a custom API integration to reach the same outcome, even if the native mechanism seems to lack a feature (here: test-gating). Get the missing piece from a layer that's designed for it instead (GitHub branch protection blocking merge of red PRs) rather than hand-rolling the platform's own trigger logic.

### 2026-07-07 — Verify IDs/values against the live system before writing them into a merged workflow

**Context:** Same Dokploy deploy workflow — needed the app's `applicationId` for the API call.
**Mistake:** Took the human-readable slug shown in the Dokploy dashboard's URL (`carnotea-9ajbgu`) and assumed it was the API's `applicationId` without confirming against Dokploy's actual API, then merged it to `main` twice before it failed with `404`.
**Rule:** Before writing an identifier sourced from a UI (URL slug, displayed ID, etc.) into a script or workflow that will run unattended, verify it against the actual API/system that will consume it — don't assume a dashboard's display value matches the backend's internal key.

### 2026-07-07 — A 200 status code alone doesn't prove the thing you meant to check is alive

**Context:** Verifying the production deploy was healthy after the SMTP fix, using `curl https://carnotea.sergiusz.dev/healthz`.
**Mistake:** Reported the API as fully healthy off a `200` response, without checking the response body. The SPA's nginx has no reverse-proxy rule for `/api/*` or `/healthz`, so every unmatched path falls through to `try_files ... /index.html` — the "200" was the React app's HTML shell, not the API's actual liveness response. The real API was unreachable through the public domain the entire time (confirmed later via a real user-facing failure: sign-up returned `405`).
**Rule:** When verifying an endpoint is "up," check the response _content_, not just the status code — an SPA's catch-all fallback, a generic error page, or a caching layer can all return `200` for a path that was never actually routed to the service being checked. Curl with `-i` or pipe to `head -c N` and eyeball the body, especially for any endpoint reachable behind a single-page-app's static file server.

### 2026-07-07 — Never log API response bodies in CI without confirming what they can contain

**Context:** Diagnosing the Dokploy deploy workflow's failures via `curl` output in GitHub Actions logs.
**Mistake:** First diagnostic fix dumped the full HTTP response body to the workflow log on failure. The endpoint (`application.one`) returns the full application record, which likely includes production env vars (DB password, auth secret, SMTP credentials) — GitHub only masks values registered as Actions secrets, not arbitrary API output, so this would have been a real credential leak on the next failure.
**Rule:** Before logging any API response body in CI (especially for debugging), check what the endpoint can return. If it might include configuration/secrets, log only specific, known-safe fields (or just the HTTP status code) — never the raw body by default.

### 2026-06-30 — Match the selected logo direction literally before stylising

**Context:** Implementing the chosen E2 logo direction for the web app.
**Mistake:** The coded SVG drifted into a generic pill mark instead of staying visually close to the selected E2 concept.
**Rule:** When implementing a user-selected logo direction, reproduce the chosen silhouette and proportions as literally as possible first; do not "interpret" the concept into a different mark without explicit approval.

### 2026-06-14 — Leave work-ticket diffs uncommitted

**Context:** Running `work-ticket T-001`.
**Mistake:** The implementation was committed during `work-ticket`, which made
the VS Code Source Control view appear empty before human review.
**Rule:** Never commit ticket implementation during `work-ticket`; leave changes
uncommitted for human review and let `ship-pr` perform commits, push, and PR
creation after approval.

### 2026-06-14 — Ship PR in logical commits

**Context:** Shipping T-001 after human review.
**Mistake:** `ship-pr` collapsed the whole reviewed diff into one large commit.
**Rule:** During `ship-pr`, split the reviewed work into logical Conventional
Commit chunks before pushing; do not make one large commit unless the whole diff
is truly one tiny change.

### 2026-06-14 — Sync before opening PR

**Context:** Opening PR #6 for T-001.
**Mistake:** The branch was pushed from a stale local base, so GitHub reported
merge conflicts even though the local checkout looked clean.
**Rule:** During `ship-pr`, fetch `origin`, rebase onto the fetched
`origin/main`, resolve conflicts locally, and validate before creating or
updating the PR.

### 2026-06-14 — Use current dependency versions

**Context:** Adding T-001 tooling dependencies.
**Mistake:** Dependency versions were selected from stale assumptions, producing
Dependabot alerts immediately after the PR was opened.
**Rule:** When adding or changing dependencies, verify the latest stable
compatible version from package-manager metadata before editing catalogs or
manifests; if the latest version is blocked, document the constraint in the
ticket notes and PR.

### 2026-06-14 — Set ticket status to done at ship-pr, not in_review

**Context:** Shipping T-002 via `ship-pr`.
**Mistake:** Ticket status was set to `in_review` after pushing the PR, leaving
it stranded in "In review" instead of "Done".
**Rule:** During `ship-pr` (Phase 6 step 8), set `status: done`, `closed_at: <today>`,
and regenerate `tickets/INDEX.md` with `pnpm tickets:index`. The PR itself is the
review artifact — the ticket is done when the PR is opened.

### 2026-06-15 — Validate env eagerly in main.ts, not only via ConfigModule

**Context:** Implementing T-004 (NestJS API skeleton).
**Mistake:** Relying solely on `ConfigModule.forRoot({ validate: validateEnv })` to
abort startup on bad env. In NestJS 11, the validate function is called during
module initialization but its thrown error does not prevent `app.listen()` from
being called; the error is swallowed by the module lifecycle.
**Rule:** Always add an eager call to `validateEnv(process.env)` at the very top
of `main.ts` (before `NestFactory.create`). This guarantees process exit-1 with a
clear human-readable message when required env vars are missing or invalid.

### 2026-06-15 — Workspace packages must export compiled dist, not raw TS

**Context:** Implementing T-004 — first runtime consumer of `@carnotea/db` and
`@carnotea/shared`.
**Mistake:** Both packages had `"exports": { ".": "./src/index.ts" }`. Node cannot
load `.ts` files; the API crashed at startup with ERR_MODULE_NOT_FOUND for `.js`
specifiers inside the packages.
**Rule:** Any package consumed by a runtime Node.js app must compile to JS and
export `dist/` with `types` + `import` conditions. Add `tsconfig.build.json` +
`build` script to each package and update exports before the first runtime consumer
is created. The Turborepo `build: dependsOn: ^build` pipeline handles ordering.

### 2026-06-21 — Derived writes share the source row's transaction

**Context:** Architecture review of the mileage/cost sync seams (T-061).
**Mistake:** `FuelLogsService.create` inserts the fuel log, then calls
`MileageSyncService.syncDerivedReading(...)`, which opens its **own**
`db.transaction`. The source insert and the derived `mileage_readings` row are not
atomic — a crash between them leaves a fuel log with no reading and a stale
`currentMileage`.
**Rule:** A resource that is a mileage/cost source must wrap its own write and the
derived sync in **one** `db.transaction(async (tx) => …)` and pass `tx` to the sync
seams; the seams take `tx` as their first argument and never open their own
transaction. See `docs/agents/patterns/resource-crud-api.md` § Derived-data hooks.

### 2026-06-25 — Respect explicit no-ticket debugging sessions

**Context:** Fixing bugs reported during a live local-app test session.
**Mistake:** Treating every non-trivial bug report as a ticket workflow even after
the human explicitly asked for immediate in-session fixes.
**Rule:** When the human explicitly overrides the ticket workflow for a live
debugging session, fix the reported bugs directly in the current checkout and
create tickets only for follow-up work the human explicitly asks to track.

### 2026-07-04 — Ship GitHub-red fixes to a PR

**Context:** Fixing a red `main` after a GitHub Actions failure.
**Mistake:** Stopping after local diagnosis and validation made the local work correct, but GitHub stayed red because no branch/PR had been pushed.
**Rule:** When the human asks to fix a red GitHub `main`, either push/open the repair PR in the same turn or explicitly say the fix is local-only and not yet visible on GitHub.

### 2026-07-04 — Verify the fresh main workflow, not only the PR

**Context:** Fixing a red `main` caused by the `Deploy` workflow.
**Mistake:** Treating a green PR as sufficient proof even though the failing signal lived on the post-merge `main` run, and the first workflow-only fix still left `main` red.
**Rule:** When fixing a red GitHub `main`, verify the exact workflow on the fresh `main` commit after merge; do not stop at a green PR or a locally validated workflow edit.

### 2026-07-04 — Match deploy automation to the real hosting target

**Context:** Cleaning up GitHub Actions after a temporary VPS-style deploy workflow was added.
**Mistake:** Keeping SSH-and-Docker-Compose deployment automation even after the human clarified the hosting direction was moving toward a different self-hosted platform model.
**Rule:** Before keeping or extending deployment automation, confirm it matches the intended hosting model; remove or disable platform-specific deploy workflows that no longer reflect the target architecture.
