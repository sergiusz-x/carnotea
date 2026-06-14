---
name: ship-pr
description: Validate the current ticket branch, push it, and open a GitHub pull request, then move the ticket to in_review. Use when the user says the work is ready to ship or asks to open a PR.
---

# ship-pr

Codex counterpart of the Claude Code `/ship-pr` command.

**Follow [`docs/agents/ticket-execution.md`](../../../docs/agents/ticket-execution.md)
§ Phase 6** — it is the single authoritative source for the PR-creation steps.

`AGENTS.md` is auto-loaded at session start — its Never rules apply here:
never push `main`, never skip validation, never commit secrets.

---

## Codex-specific notes

Run this from the ticket worktree branch, not from `main`. Follow Phase 6 from
`ticket-execution.md` step by step: fetch/rebase onto `origin/main` → validate →
derive ticket from branch → check the working tree → commit the reviewed work in
logical chunks → push → `gh pr create` → update ticket status → commit → push →
share PR URL.
