---
description: Execute a CarNotea ticket end-to-end (analyze → plan → implement → review)
argument-hint: <ticket-id, e.g. T-001 or 001>
---

Execute a CarNotea ticket end-to-end.

**Usage:** `/work-ticket <id>` — e.g. `/work-ticket T-001` or `/work-ticket 001`

> **Context check:** `AGENTS.md` is auto-loaded — its **Always / Never / Ask First**
> rules govern every action you take here. When in doubt, re-read the relevant
> section rather than guessing.

**Follow [`docs/agents/ticket-execution.md`](../../docs/agents/ticket-execution.md)
for all phases** — it is the single authoritative source for the full workflow
(Analyze → Plan → Implement → Self-review → Report → PR).

---

## Claude Code-specific deviations

### Phase 1 — Analyze
Before step 2: normalize the ticket ID — strip `T-` if present; zero-pad to three
digits (`1` → `001`). Then glob for `tickets/T-NNN-*.md`.

### Phase 2 — Plan
Use **AskUserQuestion** to present the plan and collect approval:
- Header: "Plan approval"
- Question: "Does this plan look correct? Approve to proceed, or describe what needs to change."
- Options: "Looks good — proceed" / "Needs changes (describe below)"

Do not write any code until the user approves. If changes are requested, revise
and ask again.

### Phase 3 — Implement
Use **EnterWorktree** with the branch name from the plan instead of the manual
`git worktree add` command. Use **ExitWorktree** when implementation is complete
instead of `cd` + `git worktree remove`.

### Phase 4 — Self-review
If any self-review item fails: **EnterWorktree** with the same branch to fix it,
then **ExitWorktree** again. Do not skip or downgrade a failure.

### Phase 5 — Report
Close with: "Run `/ship-pr` when you are ready to push and open a pull request."
