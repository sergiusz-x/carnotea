# Ticket execution workflow

How any agent — Claude Code, OpenAI Codex, or a human — executes a CarNotea
ticket from start to PR. This document is environment-agnostic.

This doc is the single source of truth. The per-environment skill/command files
are thin pointers to it — when the workflow changes, change it here.

- **Claude Code:** use the slash commands in `.claude/commands/` —
  `/next-ticket`, `/work-ticket <id>` (phases 1–5), `/ship-pr` (phase 6).
- **Codex:** use the project skills in `.codex/skills/` — `next-ticket`,
  `work-ticket`, `ship-pr`. Same phases.
- **Any other agent or a human:** follow the steps below directly.

> Skill/command files are scanned at startup. After adding or editing one,
> restart the agent or open a new chat before it appears.

---

## Overview

```
Analyze → Plan (human approval) → Implement (worktree) → Self-review → Report → PR
```

---

## Phase 1 — Analyze

Before touching any code:

1. Find and read the ticket file `tickets/T-NNN-*.md` completely.
2. Read every ADR the ticket references (`docs/adr/`).
3. Read the area `AGENTS.md` for the files you'll touch (`apps/<area>/AGENTS.md`
   or `packages/<pkg>/AGENTS.md`). It overrides the root `AGENTS.md` for its
   subtree.
4. Open every file in the ticket's **Files to touch** section that already
   exists. Skim other files in the same folder to absorb the local style.
5. Read `docs/agents/lessons.md`. Note any lessons that apply to this area.
6. Read `docs/conventions.md` — pay attention to commit format, branch naming,
   and PR rules. You will apply these in Phases 3 and 6.
7. Write a one-paragraph scope summary of what you understand the ticket to
   require. If anything is ambiguous, stop and ask the user before proceeding.
   Do not start coding.

---

## Phase 2 — Plan (human approval required)

Present a concrete plan in this format:

```
Branch:   <type>/T-NNN-<slug>   (type = feat / fix / chore / docs)
Worktree: ../carnotea-T-NNN

Files to create:
  <path>  — reason

Files to edit:
  <path>  — what changes

Validation to run:
  pnpm <cmd>

Open questions (if any):
  1. ...
```

Wait for explicit human approval before writing any code. If the user asks for
changes, revise the plan and seek approval again.

---

## Phase 3 — Implement (in a dedicated worktree)

**Set up the worktree** (manual step for non-Claude-Code agents):

```bash
git worktree add ../carnotea-T-NNN -b feat/T-NNN-<slug>
cd ../carnotea-T-NNN
```

Working in a separate directory keeps `main` untouched and lets multiple agents
work in parallel without conflicts.

**First action in the worktree:**
Update the ticket — `status: in_progress`, `owner: <agent-or-name>`,
`updated_at: <today>`. Move its line in `tickets/INDEX.md` to **In progress**.
Commit this change before touching any code.

**For each acceptance criterion in order:**

1. Implement the change.
2. Run the smallest validation command that covers it.
3. Confirm the AC is *actually* true. Do not tick speculatively.
   For UI ACs: open the app in `agent-browser` and exercise the change before ticking.

**After all ACs pass:**
- Record non-obvious decisions in the ticket's **Notes** section.
- Run the full validation set from the plan.
- Commit: follow `docs/conventions.md` (Conventional Commits, appropriate scope).

**Clean up the worktree** when done:

```bash
cd ../carnotea          # back to main checkout
git worktree remove ../carnotea-T-NNN   # after pushing the branch
```

---

## Phase 4 — Self-review

Read and work through every item in `docs/agents/self-review.md`.

For each item state: ✓ pass · ✗ fail (fix before continuing) · — not applicable.

Do not skip this phase.

---

## Phase 5 — Report to the user

```
Implemented
  ✓ AC 1 — one-liner
  ✓ AC 2 — one-liner

Validation
  pnpm typecheck — pass
  pnpm lint      — pass

UI verification
  agent-browser open http://localhost:PORT — <what was exercised>
  — or —
  UI not verified — <reason> (scaffold not yet done / no UI changes)

Self-review — clean / N issues found and fixed.
```

Present the report and wait for the user to confirm before opening the PR.

---

## Phase 6 — Create the PR

Only after the user confirms they are satisfied:

1. Push: `git push -u origin <branch>`.
2. Create the PR following `.github/PULL_REQUEST_TEMPLATE.md`:
   - Title: `<type>(<scope>): <ticket title>`
   - Body: link to ticket, what changed, how verified, anything *not* verified.
3. Update the ticket: `status: in_review`, `updated_at: <today>`.
   Move its line in `tickets/INDEX.md` to **In review**.
4. Commit the status update and push it to the PR branch.
5. Share the PR URL.

Claude Code agents: run `/ship-pr` for steps 1–5.
