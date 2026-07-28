---
id: T-103
title: Deliver signed webhooks with retries and network protections
status: backlog
priority: high
size: M
spec_version: 1
owner: ~
dependencies: [T-101, T-102]
labels: [api, integrations, security, reliability]
created_at: 2026-07-28
updated_at: 2026-07-28
closed_at: ~
---

# T-103 — Deliver signed webhooks with retries and network protections

## Goal

Run a safe multi-instance dispatcher that delivers queued webhook events with verifiable signatures, bounded retries, and no impact on user-facing domain writes.

## Context

T-101 queues test events and T-102 queues expense events. This ticket owns network execution. Delivery is at-least-once: a receiver may process the request and the sender may lose the response, so stable event ids and unchanged bodies across retries are mandatory.

## Contract

### Endpoints / routes

Add owner-scoped delivery observability/replay routes:

| Method | Path                                                             | Auth    | Success                           | Errors        |
| ------ | ---------------------------------------------------------------- | ------- | --------------------------------- | ------------- |
| GET    | `/api/integrations/webhooks/{id}/deliveries`                     | session | 200 paginated `WebhookDelivery[]` | 400, 401, 404 |
| GET    | `/api/integrations/webhooks/{id}/deliveries/{deliveryId}`        | session | 200 `WebhookDelivery`             | 401, 404      |
| POST   | `/api/integrations/webhooks/{id}/deliveries/{deliveryId}/replay` | session | 202 `WebhookReplayAccepted`       | 401, 404, 409 |

Replay creates a new delivery of the same immutable event with its own delivery id and attempt counter. It does not mutate historical attempts and is rejected while an active delivery for that event/subscription is pending or claimed.

### Request / response shapes

- Pagination uses `ListQuerySchema`.
- `WebhookReplayAcceptedSchema`: `{ deliveryId: UUID, eventId: UUID, status: "queued" }`.
- Delivery POST body is the exact persisted event envelope bytes serialized deterministically according to T-099.
- Headers fixed by T-099, including content type, event id/type, delivery id, timestamp, user agent, and HMAC signature.

### Provides

- `WebhookDispatcher.claimDue`, `deliver`, `recordSuccess`, `recordRetry`, and `recordTerminalFailure`.
- Lifecycle start/stop wiring with graceful claim release.
- Delivery list/detail/replay API.
- Config-validated dispatcher interval, concurrency, timeout, retry, lease, retention, and private-network policy.

### Consumes

- T-099 retry/signature/network/retention decision.
- T-101 secret decryption and owner-scoped subscription service.
- T-102 immutable expense event envelopes and pending delivery rows.

## Acceptance criteria

- [ ] Multiple API instances use atomic database claims with expiring leases so no healthy instances concurrently own the same attempt.
- [ ] Each attempt re-resolves DNS and rejects any resolved IP prohibited by T-099; redirects are either rejected or revalidated hop-by-hop exactly as decided.
- [ ] Requests have bounded connect/response timeout and body size; the dispatcher never forwards destination credentials embedded in a URL.
- [ ] Every retry sends the identical immutable event body and event id, a new delivery-attempt timestamp, and a valid HMAC-SHA256 signature using the current subscription secret.
- [ ] 2xx records success; retryable network/HTTP results follow the exact T-099 backoff schedule; non-retryable results and exhausted attempts enter terminal failure.
- [ ] A receiver outage does not fail or delay the originating expense request, and due work resumes after process restart.
- [ ] Logs, traces, delivery API, and audit rows contain destination host and sanitized outcome but no secret, signature, authorization header, payload body, DNS-sensitive data beyond policy needs, or receiver response body.
- [ ] List/detail/replay routes are session-protected and return 404 for another user's subscription or delivery.
- [ ] Manual replay preserves history, queues exactly one new delivery, and cannot race an already active delivery.
- [ ] Retention cleanup removes expired events/attempts only when no pending/retry/claimed delivery depends on them.

## Test matrix

| Case                       | Input                                      | Expected                                         |
| -------------------------- | ------------------------------------------ | ------------------------------------------------ |
| success                    | receiver returns 204                       | delivered once, terminal success                 |
| transient failure          | timeout/429/5xx then 204                   | scheduled retries then success                   |
| permanent failure          | policy-defined non-retryable 4xx           | terminal failure without retry                   |
| exhausted retry            | receiver remains unavailable               | exact max attempts and terminal failure          |
| duplicate workers          | two claims at once                         | only one obtains lease                           |
| crashed worker             | lease expires                              | another worker resumes                           |
| DNS rebinding              | hostname changes to prohibited IP          | attempt blocked before request                   |
| redirect                   | destination redirects to prohibited target | blocked per policy                               |
| signature                  | captured body/header                       | reference verifier accepts; altered body rejects |
| rotation before retry      | secret rotated after first attempt         | retry uses current valid secret per ADR          |
| cross-user log read/replay | foreign ids                                | 404                                              |
| manual replay              | terminal delivery                          | new delivery id, same event id/body              |
| restart                    | pending rows before boot                   | dispatch resumes                                 |

## Files to touch

- `apps/api/src/webhooks/webhook-dispatcher.service.ts`
- `apps/api/src/webhooks/webhook-signature.ts`
- `apps/api/src/webhooks/webhook-network-policy.ts`
- `apps/api/src/webhooks/webhooks.controller.ts`
- `apps/api/src/config/env.ts`
- `.env.example`
- `docs/getting-started.md`
- webhook unit/integration tests

## Out of scope

- A separate message broker.
- Receiver-specific adapters or payload mapping.
- Guaranteed exactly-once receiver processing.
- Browser UI.

## Implementation notes

Use fake timers and a local controlled HTTP server in tests; never call the public internet. Retry jitter must be injectable/deterministic in tests. Dispatcher shutdown must stop new claims, finish or safely release in-flight leases, then close.

## Verification

- `pnpm --filter @carnotea/api test webhooks` → dispatcher, signatures, URL policy, retries, leases, replay, and isolation tests pass.
- `pnpm --filter @carnotea/api typecheck` → zero errors.
- Start two local API instances against one test DB and one controlled receiver → one attempt per due delivery; restart resumes pending work.
- `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build` → all pass.

## References

- Decision: [T-099](./T-099-adr-outbound-webhook-delivery.md)
- Management API: [T-101](./T-101-webhook-management-api.md)
- Expense events: [T-102](./T-102-transactional-expense-events.md)
