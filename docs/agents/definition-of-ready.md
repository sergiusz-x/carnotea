# Definition of Ready

A ticket may be moved to `status: ready` **only when every box below is true**.
`ready` is a promise: an agent can pick it up and execute it end-to-end without
asking a single clarifying question. If you can't tick a box, the ticket stays
`backlog` and you fix the spec first.

This is the gate _into_ work. The [self-review checklist](./self-review.md) and
the "done" definition in the root [`AGENTS.md`](../../AGENTS.md) are the gate
_out_ of it. Don't confuse the two.

## The checklist

- [ ] **Goal** is one sentence and names the observable outcome.
- [ ] **Context** links the schema, the relevant ADR(s), and the reference
      implementation to copy.
- [ ] **Contract** is filled: endpoints/routes, request/response schemas, and
      `Provides` / `Consumes`. Every `Consumes` signature points at something
      already `done` or a frozen seam (`spec_version` pinned) in another ticket.
- [ ] **Acceptance criteria** are all concrete and verifiable. Every AC maps to
      a **Test matrix** row or a **Verification** command. No prose-only ACs
      ("works well", "is appropriate") — turn them into a checkable value.
- [ ] **Test matrix** lists the cases, including the boundary/invariant cases and
      a cross-user isolation case for any user-scoped resource.
- [ ] **Out of scope** names what this ticket does not do, so the blast radius
      is bounded.
- [ ] **Verification** lists the exact commands (with expected results) that
      prove the ACs.
- [ ] **Dependencies** in the frontmatter are all `done` — or, if a dependency
      is only providing a seam, that seam's signature is frozen and copied into
      this ticket's `Consumes`.
- [ ] **`size`** is set. If it's `L`, either split it (one ticket = one PR) or
      justify in Implementation notes why it can't be split.
- [ ] **Zero open questions.** If the ticket still asks the human anything, it is
      not ready — resolve it, record the decision in Context or Implementation
      notes, then mark ready.

## Why each rule exists

- **Contract + Provides/Consumes** stops inter-ticket drift. We already hit this:
  T-022 had to invent the `mileage-sync` seam before T-021 existed, recorded only
  as an after-the-fact note. A frozen `Provides` signature makes that a contract,
  not a surprise.
- **AC ⇒ Test matrix / Verification** is what makes the spec executable by an AI
  agent without judgement calls. "A CSP appropriate for the app" is unbuildable
  twice the same way; a named directive set is.
- **`size`** keeps "one ticket, one PR" honest and flags work that should be
  split before an agent sinks a day into it.

## When a ready ticket turns out to be wrong

Follow [`working-with-tickets.md`](./working-with-tickets.md) § "When a ticket is
wrong": edit freely while `backlog`/`ready`; once `in_progress`, record the change
in Notes and bump `spec_version`; never edit a `done` ticket — supersede it.
