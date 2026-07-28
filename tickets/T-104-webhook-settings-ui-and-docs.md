---
id: T-104
title: Add webhook settings, delivery diagnostics, and receiver docs
status: backlog
priority: medium
size: M
spec_version: 1
owner: ~
dependencies: [T-103]
labels: [web, integrations, docs, security]
created_at: 2026-07-28
updated_at: 2026-07-28
closed_at: ~
---

# T-104 — Add webhook settings, delivery diagnostics, and receiver docs

## Goal

Let users manage and troubleshoot outbound webhooks from profile settings and give generic receivers a complete, verifiable integration contract.

## Context

T-103 completes the API and dispatcher. The UI must make one-time secret handling and delivery failures understandable without exposing payloads or credentials. Documentation must be sufficient for a receiver such as an automation workflow, custom script, or integration platform to verify signatures, deduplicate events, and reconcile create/update/delete lifecycles.

## Contract

### Endpoints / routes

The web app consumes all T-101 and T-103 routes. Add:

- settings section route `/profile/integrations`;
- query keys `["integrations","webhooks"]`, `["integrations","webhooks",id]`, and `["integrations","webhooks",id,"deliveries",filters]`.

### Request / response shapes

Consume generated client types for `WebhookSubscription`, `WebhookSecretReveal`, `WebhookDelivery`, test acceptance, and replay acceptance. Do not introduce parallel hand-written API types.

### Provides

- Webhook list and create/edit form.
- One-time secret reveal with explicit copy/download warning and no later retrieval.
- Enable/disable, rotate, test, and delete actions with confirmations proportional to risk.
- Delivery history/detail showing status, timestamps, attempt count, sanitized outcome, and replay for terminal failures.
- Public receiver documentation for event envelope v1, expense snapshots, HMAC verification pseudocode, timestamp/replay validation, deduplication, revisions, delete reconciliation, retry semantics, IP policy, and secret rotation.

### Consumes

- Frozen T-101 and T-103 API/OpenAPI contracts.
- Existing profile/settings layout, generated API client, TanStack Query, forms, i18n, and design system.

## Acceptance criteria

- [ ] An authenticated user can complete every management operation from the UI without manually calling the API.
- [ ] The secret is displayed only immediately after create/rotation, is excluded from browser persistence/query cache after dismissal, and the UI clearly states it cannot be retrieved later.
- [ ] URL, event selection, enabled state, and delivery statuses have complete Polish and English text, validation, empty, loading, success, and error states.
- [ ] Delivery diagnostics show sanitized metadata only and allow replay only for API-eligible terminal deliveries.
- [ ] Destructive delete and secret rotation require explicit confirmation; rotating warns that receivers must be updated.
- [ ] Receiver docs include executable HMAC verification examples using only standard Node.js APIs and explain constant-time comparison, timestamp tolerance, stable event-id deduplication, revision handling, and delete reconciliation.
- [ ] Docs explicitly state at-least-once—not exactly-once—delivery and that event ordering must be reconciled by subject `revision`.
- [ ] Docs and UI describe the private-network administrator opt-in without weakening the secure HTTPS default.
- [ ] Responsive keyboard, focus, labels, status announcements, and contrast pass the existing UI verification checklist.

## Test matrix

| Case             | Input                                      | Expected                                        |
| ---------------- | ------------------------------------------ | ----------------------------------------------- |
| create flow      | valid URL/events                           | subscription created; secret reveal shown       |
| dismiss secret   | close reveal and revisit                   | full secret unavailable and absent from cache   |
| rotate           | confirm rotation                           | one-time new secret; warning shown              |
| invalid URL      | malformed/disallowed target                | localized field/API error                       |
| delivery failure | terminal sanitized result                  | status and replay action shown                  |
| active delivery  | pending/claimed result                     | replay unavailable                              |
| delete           | cancel then confirm                        | no deletion on cancel; deletion on confirm      |
| locale           | Polish and English                         | no hard-coded/missing strings                   |
| mobile/keyboard  | narrow viewport and keyboard-only          | full task remains operable                      |
| docs verifier    | fixture body, timestamp, secret, signature | example accepts valid and rejects modified body |

## Files to touch

- `apps/web/src/features/integrations/`
- `apps/web/src/routes/`
- `apps/web/src/locales/en/`
- `apps/web/src/locales/pl/`
- generated API client output through its generator
- `docs/integrations/webhooks.md`
- `docs/getting-started.md`
- `README.md`

## Out of scope

- Hosting an automation platform.
- Prebuilt workflows for a named third-party product.
- Payload transformation or field-mapping UI.
- Additional event families.

## Implementation notes

Never put the one-time secret in a URL, localStorage, analytics event, console, toast body retained in logs, or general TanStack Query cache. Keep it in short-lived component state and clear it on dismissal/navigation.

## Verification

- `pnpm --filter @carnotea/web test integrations` → component and query tests pass.
- `pnpm --filter @carnotea/web typecheck` → zero errors.
- `pnpm --filter @carnotea/web dev` plus browser verification → create, rotate, test, failure diagnostics, replay, delete, mobile, keyboard, and both locales pass.
- Run the documented Node signature verifier against a fixture → valid accepted, mutated body and stale timestamp rejected.
- `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build` → all pass.

## References

- Management API: [T-101](./T-101-webhook-management-api.md)
- Dispatcher API: [T-103](./T-103-secure-webhook-dispatcher.md)
- Web conventions: [`apps/web/AGENTS.md`](../apps/web/AGENTS.md)
