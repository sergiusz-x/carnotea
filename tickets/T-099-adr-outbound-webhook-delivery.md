---
id: T-099
title: Decide the outbound webhook delivery and security architecture
status: backlog
priority: high
size: M
spec_version: 1
owner: ~
dependencies: []
labels: [architecture, api, integrations, security]
created_at: 2026-07-28
updated_at: 2026-07-28
closed_at: ~
---

# T-099 — Decide the outbound webhook delivery and security architecture

## Goal

Accept an ADR that fixes the reliable, secure, product-neutral contract for delivering CarNotea domain events to user-configured external HTTPS services.

## Context

CarNotea currently writes cost-bearing records and their normalized `expenses` projection atomically in application code, but it has no supported way to notify external automation systems about committed changes. Sending HTTP during a domain write would couple availability to an external service and could lose or duplicate notifications. The decision must preserve the boundaries in [`docs/architecture.md`](../docs/architecture.md), the transaction-composable sync established by [T-061](./T-061-atomic-derived-sync-seam.md), and the security posture in [T-049](./T-049-security-hardening.md).

This ADR defines a generic outbound integration facility. It must not name or encode any particular finance application, automation vendor, category mapping, or receiving API.

## Contract

### Endpoints / routes

_n/a — this ticket records an architecture decision; implementation routes are specified by dependent tickets._

### Request / response shapes

The ADR must freeze these versioned envelope fields for every event:

- `id`: opaque globally unique event UUID.
- `type`: namespaced event name, initially `expense.created`, `expense.updated`, or `expense.deleted`.
- `schemaVersion`: positive integer, initially `1`.
- `occurredAt`: UTC ISO-8601 timestamp.
- `subject`: `{ type: "expense", id: UUID }`.
- `data`: event-type-specific snapshot defined by T-102.

The ADR must decide:

- transactional outbox semantics and the atomic boundary with domain writes;
- at-least-once delivery and receiver-side deduplication by `id`;
- ordered delivery expectations for successive events about one subject;
- HMAC-SHA256 signing over the exact request body plus timestamp;
- replay-window validation guidance;
- secret generation, hashing/encryption at rest, one-time disclosure, and rotation;
- URL policy for HTTPS, redirects, DNS resolution, private/link-local/loopback addresses, and an explicit self-host administrator opt-in for private-network targets;
- timeout, retry schedule, terminal failure state, retention, redaction, and manual replay;
- safe multi-instance dispatch using database claiming/leases without requiring a new broker;
- payload compatibility rules for additive changes and `schemaVersion` increments;
- deletion semantics using a final snapshot/tombstone rather than requiring a later read;
- observability and audit requirements without logging secrets or full sensitive payloads.

### Provides

- Accepted `docs/adr/00NN-outbound-webhook-delivery.md`.
- Frozen event envelope, delivery guarantees, signature format, URL policy, retry policy, retention periods, and dispatcher ownership model for T-100 through T-104.

### Consumes

- `CostSyncService` transaction-composable expense projection from T-061.
- Current security and configuration conventions from T-049 and `apps/api/src/config/env.ts`.

## Acceptance criteria

- [ ] A new accepted ADR compares synchronous HTTP, polling/change feed, transactional outbox, and an external queue and selects transactional outbox with a database-backed dispatcher.
- [ ] The ADR fixes every decision listed under Request / response shapes with concrete values rather than open questions.
- [ ] The ADR explicitly guarantees that a committed domain mutation cannot depend on receiver availability and that duplicate delivery is possible by design.
- [ ] The ADR defines HMAC header names, canonical signed bytes, timestamp tolerance, secret lifecycle, and constant-time verification guidance.
- [ ] The ADR defines public-network defaults and the exact administrator-controlled mechanism required to permit private-network webhook targets in self-hosted deployments.
- [ ] The ADR defines how create, update, and delete events for one expense remain reconcilable under retries and out-of-order arrival.
- [ ] The ADR explicitly prohibits receiver-specific fields, category mappings, credentials, and business logic in CarNotea.
- [ ] `docs/architecture.md` links to the ADR and describes the new boundary without claiming that it is already implemented.

## Test matrix

| Case                    | Input                                        | Expected                                                                   |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| architecture comparison | four candidate delivery designs              | trade-offs and one selected design are recorded                            |
| receiver outage         | destination unavailable during expense write | write commits; outbox remains pending                                      |
| duplicate attempt       | same event delivered twice                   | contract requires the stable same event `id`                               |
| event evolution         | additive field versus breaking shape         | compatibility rule says additive change or schema-version bump             |
| public target           | public HTTPS hostname                        | allowed by default policy                                                  |
| private target          | loopback/RFC1918/link-local hostname         | denied unless explicit self-host administrator opt-in is enabled           |
| secret exposure         | delivery logs and audit records              | no plaintext secret or authorization material                              |
| delete reconciliation   | expense removed after prior create           | delete event contains enough identity and final snapshot data to reconcile |

## Files to touch

- `docs/adr/00NN-outbound-webhook-delivery.md`
- `docs/architecture.md`

## Out of scope

- Database schema, endpoints, dispatcher code, or UI.
- Inbound API tokens.
- Receiver-specific payload transformations.
- Deploying or configuring an automation platform.

## Implementation notes

Use a new ADR; never edit an accepted ADR. Prefer platform crypto and existing PostgreSQL/NestJS facilities. If a new runtime dependency appears necessary, the ADR must justify it before any manifest is changed.

## Verification

- `pnpm format:check` → the ADR and architecture document pass formatting.
- Manual ADR review against every bullet in Contract → no unresolved decision or placeholder remains.
- `rg -n "expense.created|HMAC|at-least-once|private.network|retention" docs/adr docs/architecture.md` → each required topic is documented.

## References

- Architecture: [`docs/architecture.md`](../docs/architecture.md)
- Security baseline: [T-049](./T-049-security-hardening.md)
- Atomic derived writes: [T-061](./T-061-atomic-derived-sync-seam.md)
