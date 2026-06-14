---
name: next-ticket
description: Find the next unblocked CarNotea ticket to pick up. Use when the user asks what to work on next, or says "next ticket".
---

# next-ticket

Codex counterpart of the Claude Code `/next-ticket` command. Same logic, no
special tools required.

`AGENTS.md` is auto-loaded at session start — its Always / Never / Ask First
rules apply. Read `docs/agents/lessons.md` before recommending anything.

**Steps:**

1. Read `tickets/INDEX.md`. Identify every ticket listed under **Ready**.
2. For each ready ticket (top = highest priority), open its file and check
   the `dependencies` frontmatter field.
3. A ticket is **unblocked** when every ticket in `dependencies` has
   `status: done`. Empty `[]` = always unblocked.
4. Find the first (highest-priority) unblocked ticket.
5. Report: ID · title · priority · why unblocked · one-sentence goal ·
   "run the `work-ticket` skill with this ID to begin".
6. If the first 2–3 ready tickets are all unblocked, list them with a brief
   ordering recommendation.
