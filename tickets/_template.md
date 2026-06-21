---
id: T-NNN
title: <short imperative summary>
status: backlog
priority: medium
size: M # S = <half a day · one seam · M = one PR · L = split it (see Definition of Ready)
spec_version: 1 # bump when you change the contract after work has started
owner: ~
dependencies: []
labels: []
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
closed_at: ~
---

# T-NNN — <title>

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

_One sentence describing what success looks like._

## Context

_Why is this ticket needed now? What does it unblock? Link the schema, ADRs, and
the reference implementation an agent should copy._

## Contract

_The exact surface this ticket builds, so two agents would build the same thing.
For API tickets, follow [`docs/agents/patterns/resource-crud-api.md`](../docs/agents/patterns/resource-crud-api.md);
for web tickets, [`docs/agents/patterns/web-screens.md`](../docs/agents/patterns/web-screens.md).
Pin only the deltas from the pattern — do not restate it._

### Endpoints / routes

_API: a table. Web: the routes + the query keys._

| Method | Path   | Auth    | Success        | Errors        |
| ------ | ------ | ------- | -------------- | ------------- |
| GET    | `/...` | session | 200 `Schema[]` | 404 NOT_FOUND |

### Request / response shapes

_The Zod schemas this uses or adds (in `@carnotea/shared`), and any
response-only computed fields. Name them; don't inline the whole schema._

### Provides

_What this ticket exposes for other tickets to consume — a service seam, a route,
a shared schema. Freeze the signature here so dependents can build against it._

### Consumes

_What this ticket depends on from already-done (or frozen) tickets, with the
exact signature it calls. This is the inter-ticket contract — keep it honest._

## Acceptance criteria

_Each box must be provable by a row in Test matrix **or** a command in
Verification. No prose-only criteria._

- [ ] _Concrete, verifiable thing 1._
- [ ] _Concrete, verifiable thing 2._

## Test matrix

_The cases the tests must cover. One row = one test. Beats "tests cover X"._

| Case                   | Input               | Expected               |
| ---------------------- | ------------------- | ---------------------- |
| _happy path_           | _..._               | _..._                  |
| _boundary / invariant_ | _..._               | _400 VALIDATION_ERROR_ |
| _cross-user isolation_ | _another user's id_ | _404 NOT_FOUND_        |

## Files to touch

_A rough list of files or directories that will change. A hint, not a contract._

- `path/to/file.ts`

## Out of scope

_Things this ticket explicitly does **not** do — prevents scope creep and seeds
follow-up tickets._

- _Item A._

## Implementation notes

_Known gotchas, design hints, libraries. Treat as the running journal of
decisions; update it as the work progresses._

## Verification

_The exact commands the agent runs to prove the ACs, with expected results.
Beyond the generic validation set — the resource-specific proof._

- `pnpm --filter @carnotea/<pkg> test <area>` → all pass
- `curl ... | jq ...` → expected shape

## References

- ADR: [ADR-XXXX](../docs/adr/XXXX-...md)
- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md) / [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-XXX, T-YYY
- Schema: `packages/db/src/schema/...`, `packages/shared/src/schemas/...`
