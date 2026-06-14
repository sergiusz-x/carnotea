---
description: Find the next unblocked CarNotea ticket to pick up
---

> **Context check:** `AGENTS.md` is auto-loaded — its **Always / Never / Ask First** rules
> apply here. Read `docs/agents/lessons.md` before recommending anything.

Find the next CarNotea ticket that is safe to pick up now.

1. Read `tickets/INDEX.md`. Identify every ticket listed under **Ready**.
2. For each ready ticket (top = highest priority), open its file and read the
   `dependencies` field from the frontmatter.
3. A ticket is **unblocked** when every ticket listed in `dependencies` has
   `status: done` in its own frontmatter. An empty `[]` means always unblocked.
4. Find the first (highest-priority) unblocked ticket.
5. Report:
   - ID, title, priority
   - Why it is unblocked (deps met / no deps)
   - One-sentence goal from the ticket
   - Command to start it: `/work-ticket <id>`
6. If the first 2–3 ready tickets are all unblocked, list them with a brief
   recommendation on which to start first (e.g. "T-001 before T-002 because
   T-002 lists T-001 as a dependency").
