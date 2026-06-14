---
description: Group uncommitted changes into logical commits, propose titles and descriptions, wait for approval, then commit
---

> **Context check:** `AGENTS.md` is auto-loaded — its **Never / Always** rules apply.
> This command does not push — pushing is `/ship-pr`'s job.

Group all uncommitted changes into logically coherent commits, propose them
for review, and — after explicit approval — create them in sequence.

## Step 1 — Sync check

```bash
git fetch origin
```

Then check whether the current branch is behind its upstream:

```bash
git rev-list HEAD..origin/<current-branch> --count
```

If the count is > 0, warn the user:
> "Branch is N commit(s) behind origin/<branch>. Consider `git pull` before
> committing to avoid conflicts on push."
>
> Continue only if the user confirms they want to proceed anyway, or if
> the count is 0.

## Step 2 — Read the diff

Collect the full picture of changes:

```bash
git status
git diff HEAD        # all changes (staged + unstaged combined)
git diff --staged    # what is already staged (note separately)
```

If `git status` shows any of `.env*`, `*.key`, `*.pem`, `id_rsa`, or similar
secrets files, stop immediately and warn the user. Do not proceed until those
files are excluded or gitignored.

## Step 3 — Group into commits

Analyse the changed files and group them into logically coherent commits.
Apply these heuristics — use judgment, not rigid rules:

| Heuristic | Commit boundary |
|-----------|----------------|
| Tooling / config | Separate from feature code (package.json, tsconfig, eslint, prettier, turbo.json) |
| DB schema changes | Separate from application logic |
| Tests | Together with the code they test, unless the diff is large — then split |
| i18n strings | Together with the component that introduces them |
| Docs / ticket status | Separate commit |
| Unrelated features | Separate commits |

Prefer fewer, more coherent commits over many micro-commits. If three files
implement one logical change, that is one commit — not three.

**Do not include** in any commit group:
- `.env*` files
- Lockfiles that were not intentionally modified as part of a dependency change
- Files listed in `.gitignore`

## Step 4 — Present the plan

Show the full plan before touching git. Format each entry as:

```
Commit 1/N
  Files:  src/foo.ts, src/bar.ts
  Type:   feat(api)
  Title:  add vehicle list endpoint
  Body:
    Implements GET /vehicles returning a paginated list scoped to the
    authenticated user. Uses the existing VehicleService.findAll().

Commit 2/N
  Files:  docs/getting-started.md
  Type:   docs(getting-started)
  Title:  document vehicle list endpoint
  Body:   —
```

Commit message format follows [`docs/conventions.md`](../../docs/conventions.md)
§ Commits — types, scopes, and title rules are defined there.

## Step 5 — Wait for approval

Pause. Do not commit anything yet.

Accept these responses:
- **"yes" / "go" / "lgtm"** — proceed exactly as proposed.
- **"yes but <edit>"** — apply the stated change (e.g. swap two files, rename
  scope, merge two commits) and re-present the affected entries for
  confirmation before proceeding.
- **"no" / "cancel"** — abort cleanly. Report "No commits created."

If the user edits the plan, apply only those edits and proceed without asking
a second time unless new ambiguity arises.

## Step 6 — Execute

For each commit in the approved plan, in order:

```bash
git add <file1> <file2> ...
git commit -m "<type>(<scope>): <title>" -m "<body>"
```

Omit the body `-m` flag if the body is empty or `—`.

Do **not** append `Co-Authored-By:` or any AI attribution trailer. The
developer invoked this command — the commits are theirs.

After all commits are created, report:

```
Created N commits:
  abc1234  feat(api): add vehicle list endpoint
  def5678  docs(getting-started): document vehicle list endpoint
```

## Step 7 — Done

Remind the user that changes are committed locally but not pushed.
To push and open a PR, run `/ship-pr`.
