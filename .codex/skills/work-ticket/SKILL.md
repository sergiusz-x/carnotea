---
name: work-ticket
description: Execute a CarNotea ticket end-to-end — analyze, present a plan for human approval, implement in a dedicated git worktree, self-review, and report. Use when the user asks to work on, implement, or do a ticket (e.g. "do T-001", "work ticket 005").
argument-hint: <ticket-id, e.g. T-001 or 001>
---

# work-ticket

Codex counterpart of the Claude Code `/work-ticket <id>` command.

**Follow [`docs/agents/ticket-execution.md`](../../../docs/agents/ticket-execution.md)
exactly** — it is the single authoritative source for the full workflow
(Analyze → Plan → Implement → Self-review → Report → PR).

`AGENTS.md` is auto-loaded at session start — its Always / Never / Ask First
rules govern every action in this skill. When in doubt, re-read the relevant
section before proceeding.

---

## Codex-specific notes

**Ticket ID** comes from `$ARGUMENTS`. Normalize: strip a leading `T-`, zero-pad
to three digits (`1` → `001`), then glob `tickets/T-NNN-*.md`.

**Plan approval (Phase 2):** present the plan as plain text, then wait for an
explicit "yes" or "proceed" from the user. Write no code until you have it.
If the user asks for changes, revise and ask again.

**Worktree (Phase 3):** use manual git commands — there is no `EnterWorktree`
tool in Codex:

```bash
git worktree add ../carnotea-T-NNN -b feat/T-NNN-<slug>
cd ../carnotea-T-NNN
# ... all implementation work here ...
cd ../carnotea
git worktree remove ../carnotea-T-NNN   # after pushing the branch
```

**Self-review (Phase 4):** read and work through every item in
[`docs/agents/self-review.md`](../../../docs/agents/self-review.md).
Fix any ✗ before reporting.

**Report (Phase 5):** close with "run the `ship-pr` skill when you are ready
to push and open a pull request."
