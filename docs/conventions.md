# Conventions

The rules here are deliberately short. The point is "don't argue about this stuff
in PRs" - not "follow every micro-rule perfectly". When something feels off,
update this document and link to it from your PR.

## Code style

- TypeScript strict everywhere. No `any` without a `// FIXME(reason)` comment.
- ESM (`"type": "module"` in every package).
- Two-space indentation, LF line endings, UTF-8 - enforced by `.editorconfig` and
  Prettier.
- Maximum line length: 100 characters (soft - Prettier breaks where it makes
  sense).
- Prefer named exports. Default exports only when a framework requires it
  (e.g. Vite route modules, NestJS bootstrap).
- Don't add comments that describe what the code does - the names already do
  that. Only add a comment when the *why* is non-obvious.

## Naming

| Thing            | Style              | Example                               |
| ---------------- | ------------------ | ------------------------------------- |
| Files / folders  | `kebab-case`       | `fuel-log.service.ts`                 |
| Components       | `PascalCase` file  | `VehicleCard.tsx`                     |
| TS types         | `PascalCase`       | `FuelLog`, `CreateVehicleInput`       |
| Variables        | `camelCase`        | `currentMileage`                      |
| Constants        | `SCREAMING_SNAKE`  | `MAX_VIN_LENGTH = 17`                 |
| DB tables/cols   | `snake_case`       | `fuel_logs`, `current_mileage`        |
| URL paths        | `kebab-case`       | `/vehicles/:id/fuel-logs`             |
| i18n keys        | `dot.notation`     | `vehicle.form.title.placeholder`      |

The database side intentionally uses `snake_case` because that's the Postgres
norm. Drizzle introspection translates them to `camelCase` in TS automatically.

## Imports

Order:

1. Node built-ins (`node:fs`, ...)
2. External packages
3. Workspace packages (`@carnotea/...`)
4. Local relative imports (`./...`, `../...`)

Blank line between groups. ESLint's `import/order` enforces this.

## Commits

We follow **[Conventional Commits](https://www.conventionalcommits.org/)**.

### Subject line (required)

```
<type>(<scope>): <subject>
```

Rules — all mandatory:

- **type** — one of: `feat` `fix` `docs` `refactor` `test` `chore` `perf`
  `ci` `build` `revert`
- **scope** — one of: `api` `web` `db` `shared` `repo` `docs` `tickets`
  `adr` `tooling` `ci` (omit only for cross-cutting changes with no clear home)
- **subject** — imperative mood, lowercase start, no trailing period, ≤ 72 chars
  total line length

```
✓  feat(api): add fuel logs endpoint
✓  fix(web): correct mileage parsing for non-EN locales
✓  docs(adr): record better-auth decision
✓  refactor(db): split mileage triggers per source type
✓  chore(repo): bump turbo to 2.4
✓  test(shared): cover edge cases in VIN schema

✗  feat(api): Added fuel logs endpoint    ← past tense
✗  Fix(web): correct parsing.             ← capitalised type, trailing period
✗  feat: scaffold the new vehicle screen  ← missing scope
✗  feat(web): scaffold vite react app with full router and tanstack query setup
   ↑ over 72 chars — split across commits or shorten
```

### Body (optional, recommended for non-trivial changes)

Blank line after the subject, then explain **why** — not what the diff already
shows. Wrap at 72 characters.

```
feat(web): add offline fallback page

Service worker can't cache API responses yet, so users on a flaky
connection see a blank screen. This fallback gives a clear message
and a retry button instead.

Closes T-012.
```

### Footer

- `Closes T-NNN` — links and closes the ticket (always include for ticket work).
- `BREAKING CHANGE: <description>` — required when a public contract changes
  (HTTP route shape, env-var name, shared Zod schema). Triggers a major version
  bump in changesets.
- `Co-Authored-By: <name> <email>` — include when an AI agent co-wrote the
  commit (see below).

### AI-assisted commits

When an AI agent (Claude, Codex, …) writes or substantially contributes to a
commit, add a trailer:

```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Use the exact model that did the work. This keeps authorship honest and lets
us audit AI contributions in `git log`.

### Type reference

| Type       | When to use                                                    |
| ---------- | -------------------------------------------------------------- |
| `feat`     | New user-visible behaviour                                     |
| `fix`      | Corrects a bug                                                 |
| `docs`     | Documentation only (`.md`, ADR, comments)                     |
| `refactor` | Code change with no behaviour change and no new tests         |
| `test`     | Adding or fixing tests only                                    |
| `chore`    | Tooling, deps, config, scripts — nothing that ships           |
| `perf`     | Measurable performance improvement                             |
| `ci`       | GitHub Actions, CI config                                      |
| `build`    | Build system (Turborepo config, tsconfig, Vite config)        |
| `revert`   | Reverts a previous commit (subject = `revert: <original subject>`) |

---

## Branches

`main` is always deployable in spirit (we are pre-release, so "deployable" is
aspirational). Work happens on short-lived branches:

```
<type>/<ticket-id>-<slug>

feat/T-007-vite-react-skeleton
fix/T-042-mileage-rounding
chore/T-001-bootstrap-tooling
docs/T-000-initial-adr-set
```

Rules:
- Type prefix matches the primary commit type that will land in the PR.
- Slug is `kebab-case`, derived from the ticket title — keep it short (3–5 words).
- Delete the branch after the PR is merged.
- Never commit directly to `main`.

---

## Pull requests

### Title

Mirrors the squash-merge commit subject exactly:

```
<type>(<scope>): <subject>
```

GitHub squashes all commits on merge; the PR title becomes the commit message
on `main`. Apply the same rules as the commit subject line above.

### Description

Use [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md).
Every section is mandatory — write `n/a` rather than deleting a section.

Key principles (drawn from how Vercel, TypeScript, and other large OSS repos
handle PRs):

- **What changed** — factual, one paragraph. No marketing language.
- **Why** — link to the ticket; the ticket's Context section covers the why.
- **How it was verified** — specific: which commands ran and passed, what you
  visually checked. "It works" is not a verification.
- **Anything not done** — be explicit. A skipped test, an unverified UI path,
  a follow-up ticket you filed. Honesty here prevents silent regressions.

### Review rules

- CI must be green before requesting review.
- One approval required before merge.
- Squash-merge only — no merge commits, no rebase-merge.
- After merging, update the ticket to `status: done` in a `chore(tickets):`
  commit on `main` (or include it in the PR itself).

## Testing

| Layer                | Tooling                                       |
| -------------------- | --------------------------------------------- |
| Unit / integration   | Vitest                                        |
| E2E                  | Playwright                                    |
| DB integration       | Vitest + a real Postgres (via testcontainers) |

Mocks are a tool of last resort. If a test requires mocking the database to be
fast, it is probably the wrong test. Drizzle + a disposable Postgres container
is fast enough in practice.

## Validation

Every external input (HTTP request body / query / params, env vars, parsed JSON
from third parties) is validated with **Zod** at the boundary. Internal
functions trust their TypeScript types.

The same Zod schema can be the source for:

- runtime validation (`schema.parse(input)`),
- TypeScript types (`z.infer<typeof schema>`),
- OpenAPI fragments (`zod-to-openapi`).

Don't duplicate it as a class and a Zod schema. Pick Zod.

## Error handling

- Throw typed errors at the domain layer.
- Translate to HTTP responses only at the controller / route layer.
- No silent `catch (e) { /* nothing */ }`. If the catch is intentional, comment
  *why* in one short line.

## Logging

- Structured logging only (pino on the API side).
- No `console.log` in committed code outside of dev scripts.
- Never log secrets, full request bodies, or PII unless you've thought hard about
  it first.

## Files you shouldn't touch lightly

- Anything under `packages/db/sql/` after it has been applied to a deployed env -
  add a new migration instead.
- ADRs in `docs/adr/` once they are accepted - supersede them with a new ADR,
  don't edit history.
- `tickets/` already-merged ticket files - they are historical record.
