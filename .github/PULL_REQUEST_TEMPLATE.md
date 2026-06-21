<!--
  Title should match the squashed commit subject, e.g.
  feat(web): scaffold Vite + React app
-->

## Ticket

Closes T-XXX

<!-- If this PR doesn't close a ticket, explain why (trivial fix, etc.). -->

## What changed

<!-- A short, factual summary of the change. What, not why-it's-great. -->

## Why

<!-- The reason this work exists now. Link the ticket's context if it covers it. -->

## How it was verified

<!-- Be specific and honest. Which commands did you run? What did you click? -->

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build` (if applicable)
- [ ] `pnpm lint:ws` (sherif)
- [ ] UI changes visually verified <!-- or: N/A / not verified because ... -->

## Checklist

- [ ] One ticket, one PR — no unrelated changes snuck in.
- [ ] Every acceptance-criterion box in the ticket is genuinely true.
- [ ] Docs touched by this change were updated in this PR
      (`README.md`, `docs/*`, area `AGENTS.md`, `docs/tech-stack.md`).
- [ ] New top-level dependency / tool? An ADR was added or updated.
- [ ] User-facing strings exist in both `pl` and `en`.
- [ ] The ticket's `status` was updated and `tickets/INDEX.md` regenerated (`pnpm tickets:index`).

## Anything not done / follow-ups

<!-- Skipped tests, unverified paths, new tickets you filed. Honesty over polish. -->
