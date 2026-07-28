---
id: T-100
title: Add webhook subscription, outbox, and delivery contracts
status: backlog
priority: high
size: M
spec_version: 1
owner: ~
dependencies: [T-099]
labels: [database, shared, integrations, security]
created_at: 2026-07-28
updated_at: 2026-07-28
closed_at: ~
---

# T-100 — Add webhook subscription, outbox, and delivery contracts

## Goal

Provide the database model and shared Zod contracts needed to configure user-owned webhooks and durably track every event and delivery attempt.

## Context

T-099 freezes the delivery architecture. This ticket implements only the persistence and reusable contracts, so subsequent API and dispatcher work share one source of truth. Ownership must remain tied to the authenticated CarNotea user and secrets must never be stored or returned in plaintext after creation.

## Contract

### Endpoints / routes

_n/a — persistence and shared schemas only._

### Request / response shapes

Add shared schemas and inferred types:

- `WebhookEventTypeSchema`: initially the exact enum `expense.created`, `expense.updated`, `expense.deleted`.
- `WebhookSubscriptionSchema`: `id`, `name`, redacted `url`, `eventTypes`, `enabled`, `secretHint`, `createdAt`, `updatedAt`, `lastDeliveryAt`, `disabledAt`.
- `WebhookSubscriptionCreateSchema`: `name` 1–80 chars, absolute URL, non-empty unique event type array.
- `WebhookSubscriptionUpdateSchema`: partial name/URL/event types/enabled; an empty body is invalid.
- `WebhookSecretRevealSchema`: full subscription response plus `secret`, used only on create or rotation.
- `WebhookEventEnvelopeV1Schema`: the frozen T-099 envelope with event data represented by a discriminated union.
- `WebhookDeliverySchema`: delivery id, event id/type, status, attempt number, response status, sanitized error code, `nextAttemptAt`, `attemptedAt`, `deliveredAt`; never request/response bodies or secrets.

Add Drizzle tables:

- `webhook_subscriptions`: UUID, `userId`, name, normalized target URL, selected event types, encrypted/authenticated signing-secret material according to T-099, non-secret hint, enabled/disabled timestamps, delivery timestamp, created/updated timestamps.
- `webhook_events`: immutable UUID event envelope fields, `userId`, subject type/id, event type, schema version, occurred time, JSON data, created time, retention/purge time.
- `webhook_deliveries`: one row per `(eventId, subscriptionId)`, state, attempts, claim/lease fields, retry time, sanitized latest outcome, delivery time, created/updated timestamps.
- `webhook_delivery_attempts`: bounded/redacted attempt metadata needed for the delivery history defined by T-099.

Required constraints/indexes:

- all child rows cascade safely when their owning user/subscription/event is removed;
- unique `(event_id, subscription_id)`;
- dispatcher index over state and `next_attempt_at`;
- lease lookup index;
- no plaintext-secret column;
- check constraints for states, non-negative attempts, and valid terminal timestamps.

### Provides

- Shared Zod schemas/types named above from `@carnotea/shared`.
- Drizzle table exports for subscriptions, events, deliveries, and attempts.
- Generated migration implementing the reviewed schema.

### Consumes

- Frozen architecture values from T-099 `spec_version: 1`.
- Domain user identity from `packages/db/src/schema/users.ts`.

## Acceptance criteria

- [ ] All shared schemas are exported from `@carnotea/shared`, infer their TypeScript types, and reject unknown event names and malformed URLs.
- [ ] The generated database migration creates all four tables, constraints, foreign keys, and dispatcher indexes specified in Contract.
- [ ] No schema, response type, or migration contains a plaintext signing-secret field.
- [ ] Subscription and delivery list responses cannot expose encrypted secret material, raw payload bodies, or response bodies.
- [ ] A database test proves duplicate `(eventId, subscriptionId)` delivery creation is rejected.
- [ ] A database test proves deleting a user removes owned integration records without affecting another user's rows.
- [ ] Schema tests cover create/update validation, one-time secret reveal, delivery states, and all three initial expense event types.
- [ ] DB and shared package documentation identify the ownership and secret-storage invariants.

## Test matrix

| Case                 | Input                                                  | Expected                                     |
| -------------------- | ------------------------------------------------------ | -------------------------------------------- |
| valid subscription   | HTTPS URL and two supported event types                | schemas accept                               |
| unknown event        | `vehicle.teleported`                                   | schema rejects                               |
| empty update         | `{}`                                                   | schema rejects                               |
| secret list exposure | persisted encrypted secret material                    | public subscription schema strips/rejects it |
| duplicate fan-out    | same event and subscription twice                      | unique constraint rejects second row         |
| due delivery query   | pending due, future retry, delivered rows              | dispatcher index supports only due candidate |
| cross-user cascade   | delete user A with user B rows present                 | only A's integration rows disappear          |
| invalid state        | negative attempts or delivered state without timestamp | DB check rejects                             |

## Files to touch

- `packages/db/src/schema/webhooks.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/migrations/`
- `packages/shared/src/schemas/webhook.ts`
- `packages/shared/src/schemas/webhook.test.ts`
- `packages/shared/src/schemas/index.ts`
- `packages/db/AGENTS.md`
- `packages/shared/AGENTS.md`

## Out of scope

- HTTP management endpoints.
- Event creation from expense mutations.
- Network delivery, retry scheduling, or UI.
- Additional event families.

## Implementation notes

Follow T-099 exactly for encrypted secret storage and retention values. Generate migrations through Drizzle; do not hand-edit generated migration or journal files.

## Verification

- `pnpm --filter @carnotea/shared test webhook` → schema matrix passes.
- `pnpm --filter @carnotea/shared typecheck` → zero errors.
- `pnpm --filter @carnotea/db db:generate` → reviewed migration generated from schema.
- `pnpm --filter @carnotea/db test` → database contract tests pass or are honestly reported skipped without `DATABASE_URL`.
- `pnpm lint && pnpm format:check && pnpm typecheck` → all pass.

## References

- Decision: [T-099](./T-099-adr-outbound-webhook-delivery.md)
- DB rules: [`packages/db/AGENTS.md`](../packages/db/AGENTS.md)
- Shared rules: [`packages/shared/AGENTS.md`](../packages/shared/AGENTS.md)
