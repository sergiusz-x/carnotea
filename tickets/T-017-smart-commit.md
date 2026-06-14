---
id: T-017
title: Add /smart-commit slash command and Codex skill
status: done
priority: medium
owner: sergiusz-x
dependencies: []
labels: [tooling, dx, agent-workflow]
created_at: 2026-06-14
updated_at: 2026-06-14
closed_at: 2026-06-14
---

# T-017 — Add /smart-commit slash command and Codex skill

## Goal

Agents and developers can run `/smart-commit` to have their uncommitted
changes automatically grouped into logically coherent commits, each with a
Conventional Commit message, reviewed and approved before anything is written
to git history.

## Context

The existing commit workflow is manual and error-prone: developers (and agents
executing tickets) either commit everything at once or have to mentally group
changes themselves. `/smart-commit` automates the grouping step — it inspects
`git status` + `git diff`, proposes a split, waits for explicit approval, then
creates the commits in sequence. It also syncs awareness of the remote branch
so the developer knows whether they're safe to commit before a future push.

This complements the existing skill trio:
- `/work-ticket` — implements and commits within a worktree (will delegate to
  `/smart-commit` for its commit step once T-017 lands)
- `/ship-pr` — pushes and opens a PR (unchanged; this command does not push)

## Acceptance criteria

- [x] `.claude/commands/smart-commit.md` exists and when invoked:
  - Runs `git fetch origin` and reports if the current branch is behind its
    upstream (warn but do not auto-pull — let the developer decide).
  - Reads `git status` and `git diff HEAD` (captures both staged and unstaged
    changes together; also notes if anything is already staged).
  - Groups the changed files into logically coherent commits. Guiding
    heuristics (use judgment, not rigid rules):
    - Tooling / config changes (root manifests, tsconfig, eslint, prettier)
      → separate from feature code.
    - Schema changes → separate from application logic.
    - Tests → together with the code they test, unless the diff is large.
    - Docs / ticket status updates → separate commit.
    - Unrelated features → separate commits.
  - Presents a numbered plan. For each proposed commit:
    ```
    Commit 1/N
      Files:  src/foo.ts, src/bar.ts
      Type:   feat(api)
      Title:  add vehicle endpoint
      Body:   Implements GET /vehicles/:id returning the full vehicle record.
    ```
  - Waits for explicit developer approval before touching git. Accepted
    responses: "yes" / "go" / "lgtm" (proceed as-is), "yes but <edit>"
    (apply the stated change and proceed), "no" / "cancel" (abort cleanly).
  - On approval: stages and commits each group in sequence using
    `git add <files> && git commit -m "..."`. Commit message format:
    `<type>(<scope>): <title>\n\n<body>` following Conventional Commits.
  - Refuses to include `.env*`, secrets, or lockfiles in any commit, and
    warns explicitly if they appear in `git status`.
  - Does NOT push. Pushing is `/ship-pr`'s responsibility.
  - Reports the final list of created SHAs and their titles.

- [x] `.codex/skills/smart-commit/SKILL.md` exists with equivalent
  instructions for Codex CLI, following the same steps.

- [x] `AGENTS.md` Skills table has a `smart-commit` row with the Claude Code
  command, the Codex skill name, and a reference to the command file.

- [x] `docs/getting-started.md` documents `/smart-commit` in a short
  "Committing changes" section.

## Files to touch

- `.claude/commands/smart-commit.md`  — new
- `.codex/skills/smart-commit/SKILL.md` — new
- `AGENTS.md` — add row to Skills table
- `docs/getting-started.md` — add Committing changes section

## Out of scope

- Pushing to origin (that stays with `/ship-pr`).
- Amending or rebasing existing commits.
- Auto-detecting the linked ticket ID from changes (branch name is enough
  context; the developer sets the ticket status separately).
- Resolving merge conflicts — the command warns if the branch is behind and
  stops there.

## Implementation notes

The command files are pure Markdown instructions — no compiled code. The
"implementation" is writing clear, unambiguous step-by-step prose that any
agent can follow deterministically.

For grouping logic: instruct the agent to prefer fewer, more coherent commits
over many micro-commits. A single logical change that touches three files is
one commit, not three.

Soft dependency on T-013 (commitlint): once T-013 lands, `git commit` will be
validated by the commitlint hook automatically. The smart-commit command should
already produce valid Conventional Commit messages, so no extra work is
needed — commitlint will just confirm it.

The `git fetch origin` step must run before reading `git diff` so the behind
check is accurate. Do not skip it even when the diff is clean (the point is
to give the developer an honest picture before they commit).

## References

- Related tickets: T-013 (commitlint enforces the format this command
  produces), T-015 (CI validates commits on push)
- Conventional Commits spec: https://www.conventionalcommits.org/en/v1.0.0/
- Existing command to model: `.claude/commands/ship-pr.md`
