# Lessons

A running log of corrections. When a human corrects an agent — "no, do it this
way", "you broke X", "we don't do that here" — the agent appends a lesson so the
same mistake doesn't happen twice. This is the repo's memory of its own
mistakes.

## How to use this file

- **One correction → one lesson.** Add it as soon as you're corrected, in the
  same change if possible.
- Write the lesson as a **rule**, not a story. "Always X" / "Never Y" / "When Z,
  do W" — phrased so the next agent can act on it without the backstory.
- If a lesson generalises, promote it: move it into the relevant `AGENTS.md`
  (root or area) and leave a one-line pointer here. `AGENTS.md` is loaded every
  session; this file is read on demand.
- Keep entries dated and short. Prune lessons that became obsolete (the code or
  rule they guarded against is gone).

## Format

```
### YYYY-MM-DD — <short title>

**Context:** what was being done.
**Mistake:** what went wrong.
**Rule:** the durable instruction that prevents a repeat.
```

## Lessons

_None yet. The first correction goes here._
