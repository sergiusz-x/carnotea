---
id: T-107
title: Integrate official HistoriaPojazdu.gov.pl vehicle history
status: backlog
priority: medium
size: L # S = <half a day · one seam · M = one PR · L = split it (see Definition of Ready)
spec_version: 1 # bump when you change the contract after work has started
owner: ~
dependencies: []
labels: [api, integration, vehicle-history, legal]
created_at: 2026-08-01
updated_at: 2026-08-01
closed_at: ~
---

# T-107 — Integrate official HistoriaPojazdu.gov.pl vehicle history

> Fill every section. A section that does not apply gets `_n/a_` — never delete
> it, so the next agent knows you considered it. A ticket is only moved to
> `ready` once it passes [`docs/agents/definition-of-ready.md`](../docs/agents/definition-of-ready.md).

## Goal

Allow a vehicle owner to retrieve and view available official Polish vehicle-history data in CarNotea, using an authorized and documented HistoriaPojazdu.gov.pl integration path.

## Context

HistoriaPojazdu.gov.pl is a government service and may impose identity, data-entry, consent, rate-limit, or public-API requirements. The integration must be designed around the official terms and technical interface, never through scraping or automation that bypasses the service's protections.

## Contract

First validate the official integration path, permitted data scope, authentication requirements, retention rules, consent copy, and availability of a machine-readable API. If a supported interface exists, define and implement a user-initiated import for an owned vehicle; otherwise record the evidence and split a compliant alternative into a follow-up ticket.

### Endpoints / routes

| Method | Path | Auth | Success | Errors |
| ------ | ---- | ---- | ------- | ------ |
| _TBD after official API discovery_ | _TBD_ | session | Imported official vehicle history | Validation, upstream availability, authorization |

### Request / response shapes

_TBD after confirmation of the official API contract._ Any external response must be validated with Zod at the API boundary; no government credential, VIN, registration number, or document number may be logged unnecessarily.

### Provides

Either a documented, approved integration contract for importing official vehicle-history data, or an evidence-backed decision that no supported integration is currently available.

### Consumes

An official HistoriaPojazdu.gov.pl API/programme specification and terms that explicitly permit this product use. Existing user-scoped vehicle ownership and profile/session facilities.

## Acceptance criteria

- [ ] The ticket notes cite the official technical documentation and terms governing the integration, including allowed authentication, rate limiting, and data-retention requirements.
- [ ] No scraping, CAPTCHA bypass, credential sharing, or browser automation against HistoriaPojazdu.gov.pl is implemented or proposed.
- [ ] If an official supported API exists, all external request and response payloads are Zod-validated at the boundary and imports are scoped to the signed-in user's selected vehicle.
- [ ] If a supported API does not exist or does not permit this use, the ticket records the blocker with source links and creates a separately scoped compliant follow-up rather than implementing an unsupported workaround.
- [ ] Any stored government-sourced data has a documented user purpose, refresh strategy, retention/deletion policy, and Polish/English consent and error text.

## Test matrix

| Case | Input | Expected |
| ---- | ----- | -------- |
| Official success response | Valid documented upstream fixture | Validated data maps to the approved import/view model |
| Malformed upstream response | Missing or invalid upstream fields | Boundary rejects it safely without persisting partial data |
| Unauthorized vehicle access | Another user's vehicle identifier | No data is fetched or exposed; existing authorization error |
| Upstream unavailable | Timeout or documented upstream failure | Localized safe error, no credentials or sensitive identifiers leaked |
| Unsupported integration | Official documentation shows no permitted API | Evidence recorded and compliant follow-up ticket created |

## Files to touch

- `apps/api/src/`
- `apps/web/src/`
- `packages/shared/src/`
- `packages/db/src/schema/` _only if approved data retention requires persistence_
- `docs/`
- `tickets/`

## Out of scope

- Scraping the public website or automating its browser flow.
- Circumventing CAPTCHA, login, consent, access restrictions, or rate limits.
- Persisting government credentials or document numbers beyond what the approved contract strictly requires.
- Integrations with non-official vehicle-history providers.

## Implementation notes

This is deliberately L-sized and must be split only after the official integration path is established: discovery/compliance decision, API contract/persistence, and web flow may each become separately ready tickets. Before adding an SDK or dependency, verify the current compatible version and obtain the required ADR approval. Treat upstream data as untrusted third-party JSON.

## Verification

- `pnpm --filter @carnotea/api test` → boundary, authorization, and upstream-failure tests pass
- `pnpm lint`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm lint:tickets`

## References

- Related tickets: T-020, T-033, T-052
- Pattern: [resource-crud-api](../docs/agents/patterns/resource-crud-api.md) / [web-screens](../docs/agents/patterns/web-screens.md)
- External authority: HistoriaPojazdu.gov.pl official documentation and terms _to be verified during discovery_
