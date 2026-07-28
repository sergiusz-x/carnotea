---
id: T-101
title: Add user-owned webhook management API
status: backlog
priority: high
size: M
spec_version: 1
owner: ~
dependencies: [T-100]
labels: [api, integrations, security, openapi]
created_at: 2026-07-28
updated_at: 2026-07-28
closed_at: ~
---

# T-101 — Add user-owned webhook management API

## Goal

Let an authenticated user securely create, inspect, update, disable, rotate, test, and delete their own outbound webhook subscriptions.

## Context

T-100 provides persistence and shared contracts. The management surface must be usable by generic automation receivers while preventing cross-user discovery, accidental secret disclosure, and unsafe target URLs. All routes use the existing better-auth session; a webhook secret authenticates deliveries, not callers of this management API.

## Contract

### Endpoints / routes

| Method | Path                                            | Auth    | Success                     | Errors             |
| ------ | ----------------------------------------------- | ------- | --------------------------- | ------------------ |
| GET    | `/api/integrations/webhooks`                    | session | 200 `WebhookSubscription[]` | 401                |
| POST   | `/api/integrations/webhooks`                    | session | 201 `WebhookSecretReveal`   | 400, 401, 409      |
| GET    | `/api/integrations/webhooks/{id}`               | session | 200 `WebhookSubscription`   | 401, 404           |
| PATCH  | `/api/integrations/webhooks/{id}`               | session | 200 `WebhookSubscription`   | 400, 401, 404, 409 |
| POST   | `/api/integrations/webhooks/{id}/rotate-secret` | session | 200 `WebhookSecretReveal`   | 401, 404           |
| POST   | `/api/integrations/webhooks/{id}/test`          | session | 202 `WebhookTestAccepted`   | 401, 404, 409      |
| DELETE | `/api/integrations/webhooks/{id}`               | session | 204                         | 401, 404           |

`POST .../test` queues a normal signed `webhook.test` delivery through the outbox seam; it does not perform synchronous HTTP. `webhook.test` is a system-only event type and cannot be selected in subscription event filters.

### Request / response shapes

Use T-100 schemas. Add:

- `WebhookTestAcceptedSchema`: `{ eventId: UUID, status: "queued" }`.
- UUID path schemas through the existing route helpers.
- Standard `ErrorResponseSchema` for every non-2xx response.

The generated signing secret is at least 256 bits of cryptographic entropy, encoded as an opaque prefixed token. It is returned exactly once on create/rotation. Rotation invalidates the previous secret before the response is returned.

### Provides

- `WebhookSubscriptionsService` owner-scoped management seam.
- `WebhookEventWriter.enqueueTestEvent(tx, { userId, subscriptionId })`.
- OpenAPI-documented routes above.

### Consumes

- T-100 shared schemas and persistence contract, `spec_version: 1`.
- Existing `AuthGuard`, `CurrentUser`, Zod/OpenAPI helpers, and error envelope.
- T-099 URL-security policy.

## Acceptance criteria

- [ ] Every route is session-protected, owner-scoped in its database predicate, registered in OpenAPI, and returns 404 for another user's id.
- [ ] Create and URL update apply the complete T-099 target validation policy before persistence, including normalization, redirect policy metadata, and administrator private-network opt-in.
- [ ] Create and rotation reveal a new secret once; list/get/update/delete/test and logs never return it or its encrypted representation.
- [ ] Rotation immediately makes signatures with the old secret invalid and new signatures valid.
- [ ] Test delivery returns 202 only after the event and delivery row are durably queued; it never waits for receiver HTTP.
- [ ] Duplicate subscription names for one user return the documented 409 while the same name remains valid for another user.
- [ ] Delete removes the subscription and pending deliveries according to T-099 retention rules without deleting immutable audit metadata required by that ADR.
- [ ] Audit logs record create, update, enable/disable, rotate, test, and delete actions without URL credentials, secret bytes, or payload bodies.

## Test matrix

| Case                      | Input                                              | Expected                                    |
| ------------------------- | -------------------------------------------------- | ------------------------------------------- |
| create                    | valid public HTTPS URL and supported events        | 201, secret revealed once                   |
| list after create         | same session                                       | 200, secret absent, hint present            |
| cross-user get/mutate     | user B requests user A id                          | 404, no row changed                         |
| malformed target          | credentials in URL, fragment, invalid protocol     | 400 VALIDATION_ERROR                        |
| disallowed network        | loopback/private/link-local target with opt-in off | 400 VALIDATION_ERROR                        |
| explicit self-host opt-in | allowed private target under configured policy     | accepted                                    |
| rotate                    | existing subscription                              | old signature fails, new signature succeeds |
| queue test                | valid owned id                                     | 202 and one durable test delivery           |
| duplicate name            | same owner and normalized name                     | 409 CONFLICT                                |
| audit redaction           | all mutation actions                               | action present; no full secret/payload      |

## Files to touch

- `apps/api/src/webhooks/`
- `apps/api/src/app.module.ts`
- `apps/api/src/config/env.ts`
- `.env.example`
- `packages/shared/src/schemas/webhook.ts`
- API OpenAPI tests

## Out of scope

- Dispatcher network execution.
- Expense event emission.
- Browser UI.
- Receiver-specific transformations or OAuth.

## Implementation notes

Resolve DNS and enforce the URL policy again at delivery time; creation-time validation alone is insufficient against DNS rebinding. Do not log incoming secrets or include them in exception metadata.

## Verification

- `pnpm --filter @carnotea/api test webhooks` → controller, service, isolation, rotation, test-queue, and audit cases pass.
- `pnpm --filter @carnotea/api typecheck` → zero errors.
- `curl -s localhost:3001/openapi.json | jq '.paths | keys[] | select(startswith("/api/integrations/webhooks"))'` → all seven paths/operations are present.
- `pnpm lint && pnpm format:check && pnpm typecheck` → all pass.

## References

- Architecture decision: [T-099](./T-099-adr-outbound-webhook-delivery.md)
- Persistence/contracts: [T-100](./T-100-webhook-persistence-and-contracts.md)
- API conventions: [`apps/api/AGENTS.md`](../apps/api/AGENTS.md)
