# Self-review checklist

Run this after every implementation, before opening a PR. For each item state:
✓ pass · ✗ fail (fix before continuing) · — not applicable.

Do not skip this phase. A failure caught here costs nothing; a failure caught in
review costs everyone's time.

## Acceptance criteria

- [ ] Every box in the ticket's **Acceptance criteria** is checked and _actually_
      true. Re-read each one from the ticket; do not tick speculatively.

## Code quality

- [ ] No `any` without a `// FIXME(reason)` comment.
- [ ] No hardcoded user-facing strings in JSX/TSX. All strings go through i18n.
      Both `pl` and `en` translation files are updated if strings were added.
- [ ] Every external input (HTTP body, query, env, third-party JSON) is validated
      with Zod at the boundary. Types derived with `z.infer` — no parallel TS
      types written by hand.
- [ ] No speculative code: no abstractions "for later", no fallbacks for
      impossible states, no feature flags before a second behaviour exists.
- [ ] No new top-level dependency added without an ADR or an update to an
      existing ADR.
- [ ] No generated files edited by hand (`*.gen.ts`, `*.d.ts`, lockfiles,
      `packages/db/migrations/*.sql`).
- [ ] No secrets, real `.env` values, or tokens committed.

## Docs

- [ ] New `pnpm <command>` → documented in `docs/getting-started.md`.
- [ ] New package → row added to `docs/tech-stack.md`.
- [ ] New top-level folder → repo map in `AGENTS.md` and `README.md` updated.
- [ ] Area `AGENTS.md` updated if the area's conventions changed.

## Ticket hygiene

- [ ] Ticket frontmatter: `status` updated, `owner` set, `updated_at` is today.
- [ ] `tickets/INDEX.md` reflects the current status.
- [ ] Non-obvious decisions recorded in the ticket's **Notes** section.

## Validation

- [ ] `pnpm lint` — pass (or no TS/JS/JSON files changed).
- [ ] `pnpm typecheck` — pass (or no TS files changed).
- [ ] `pnpm test` — pass (or no logic changed that has unit/integration tests).
- [ ] `pnpm build` — pass (or no build-affecting files changed).

## UI verification

Run this section when the ticket touches `apps/web`, any React component, or any
route/page. Mark `—` (not applicable) for purely back-end, infra, or docs changes.

- [ ] Dev server is running: `pnpm --filter @carnotea/web dev`
- [ ] Open the app: `agent-browser open http://localhost:PORT`
- [ ] Snapshot interactive elements: `agent-browser snapshot -i`
      Confirm that elements added or changed by this ticket appear in the output.
- [ ] Walk through every AC that has a visible UI outcome. Use
      `agent-browser click`, `agent-browser fill`, etc. to drive the golden path.
      If something breaks, capture it: `agent-browser screenshot <slug>-fail.png`
- [ ] Glance at adjacent screens for obvious regressions.

If the dev server cannot start (scaffold ticket not yet done, missing deps), report
it explicitly in the Phase 5 report:
`UI not verified — <reason>`

Never write "UI verified" when you did not open agent-browser. See [Be honest](../../AGENTS.md#be-honest).

## PR readiness

- [ ] Branch follows `<type>/T-NNN-<slug>` naming.
- [ ] No leftover debug logs, `console.log`, or commented-out dead code.
- [ ] Commit history is clean. No "wip", "temp", or "fix fix" commits —
      squash or amend before pushing if needed.
