---
description: Execute a CarNotea ticket end-to-end (analyze → plan → implement → review)
argument-hint: <ticket-id, e.g. T-001 or 001>
---

Execute a CarNotea ticket end-to-end.
Workflow: Analyze → Plan (human approval) → Implement in worktree → Self-review → Report.

**Usage:** `/work-ticket <id>` — e.g. `/work-ticket T-001` or `/work-ticket 001`

> **Context check:** `AGENTS.md` is auto-loaded — its **Always / Never / Ask First**
> rules govern every action you take in this skill. When in doubt about a rule,
> stop and re-read the relevant section rather than guessing.
>
> The environment-agnostic workflow lives in `docs/agents/ticket-execution.md`.
> This file is the Claude Code implementation — it uses `EnterWorktree`,
> `ExitWorktree`, and `AskUserQuestion` instead of manual shell commands.

---

## Phase 1 — Analyze

1. Normalize the ID: strip `T-` if present; zero-pad to three digits (`1` → `001`).
2. Glob for the ticket file: `tickets/T-NNN-*.md`. Read it completely.
3. Read every ADR the ticket references.
4. If an area `AGENTS.md` exists for the files the ticket touches
   (`apps/<area>/AGENTS.md`, `packages/<pkg>/AGENTS.md`), read it.
5. Open every file in the ticket's **Files to touch** section that already
   exists. Skim other files in the same folder to absorb the local style.
6. Read `docs/agents/lessons.md` — note any lessons that apply to this area.
7. Read `docs/conventions.md` — note the commit format, branch naming, and PR
   rules. You will apply these in Phases 3 and 5. Do not skip this step.
8. Output a **one-paragraph scope summary** of what the ticket requires, what
   you'll create or change, and any ambiguity you spotted.
   Wait for the user to acknowledge before proceeding. Do not write any code yet.

---

## Phase 2 — Plan (human approval required)

Build a concrete plan. Present it in this exact format:

```
Branch:   <type>/T-NNN-<slug>   (type = feat / fix / chore / docs — match the work)
Worktree: will be created automatically at ../carnotea-T-NNN

Files to create:
  packages/db/src/schema/vehicles.ts  — reason

Files to edit:
  tickets/T-NNN-*.md                  — status → in_progress
  tickets/INDEX.md                    — move line to In progress

Validation to run:
  pnpm typecheck
  pnpm lint

Open questions (if any):
  1. ...
```

Use **AskUserQuestion** to present:
- Header: "Plan approval"
- Question: "Does this plan look correct? Approve to proceed, or describe what needs to change."
- Options: "Looks good — proceed" / "Needs changes (describe below)"

**Do not write any code until the user approves.**
If the user requests changes, revise the plan and seek approval again.

---

## Phase 3 — Implement

1. Use **EnterWorktree** with the branch name from the plan.
   The worktree isolates your work; other agents can run in their own worktrees
   in parallel without interference.
2. **First action in the worktree:** update the ticket — `status: in_progress`,
   `owner: claude`, `updated_at: <today>`. Move the line in `tickets/INDEX.md`
   from **Ready** to **In progress**. Commit this change.
3. Work through the acceptance criteria in order. For each AC:
   a. Implement the change.
   b. Run the smallest validation command that covers it.
   c. Verify the AC is *actually* true — do not tick speculatively.
4. After all ACs pass, add a **Notes** section to the ticket recording any
   non-obvious decisions or trade-offs.
5. Run the full validation set from the plan.
6. **ExitWorktree** once all ACs pass and validation is green.

---

## Phase 4 — Self-review

After exiting the worktree, read `docs/agents/self-review.md` and evaluate
every item against the work just done. State ✓ pass, ✗ fail, or — n/a.

If any item **fails**: EnterWorktree with the same branch, fix it, ExitWorktree,
and re-run the relevant validation. Do not skip or downgrade a failure.

---

## Phase 5 — Report

```
Implemented
  ✓ AC 1 — one-liner
  ✓ AC 2 — one-liner

Validation
  pnpm typecheck — pass
  pnpm lint      — pass
  pnpm test      — skipped (no tests in scope for this ticket)

Not verified (if any)
  UI was not opened in a browser — will flag in PR description.

Self-review — clean / N issues found and fixed.
```

Close with:
> Run `/ship-pr` when you are ready to push and open a pull request.
