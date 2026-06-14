# ADR-0003: REST API with OpenAPI generated from Zod

- **Status**: accepted
- **Date**: 2026-06-13
- **Deciders**: Sergiusz, Claude

## Context

The API needs:

- a stable HTTP contract the web client can consume,
- strong validation of every external input,
- shareable types between API and client,
- something readable by humans browsing the API,
- something readable by tooling (codegen, future mobile clients).

We chose NestJS for the API. The question is what shape the API takes (REST vs
GraphQL vs tRPC), and how validation and the schema are described.

## Decision

We use a **REST API** with an **OpenAPI 3** description generated from **Zod**
schemas. Each endpoint declares its request and response shapes as Zod schemas,
which are then:

1. used at runtime to validate the request (`schema.parse(req.body)`),
2. used at compile time to derive TypeScript types (`z.infer<typeof schema>`),
3. converted to OpenAPI fragments (via `zod-to-openapi` or equivalent) and
   exposed at `GET /docs`.

The same Zod schemas live in `packages/shared` so the web client can use them
for form validation without round-tripping the API.

The web client gets a typed HTTP client generated from the OpenAPI document
(`openapi-typescript` + a thin fetch wrapper or `openapi-fetch`).

## Consequences

### Positive

- One schema definition serves validation, types, and documentation.
- No drift between the documented contract and the runtime behaviour, because
  the runtime *is* the contract.
- REST is well-understood by tooling, proxies, mobile clients, and humans.
- Future non-web clients (a Swift app, a Kotlin app) can codegen from OpenAPI.

### Negative

- We forgo tRPC's end-to-end type inference; instead we rely on regenerated
  client types. This is a small ceremony cost per API change.
- A few NestJS idioms (DTO classes with decorators) don't apply; we keep the
  module/controller/service structure but skip class-validator.

### Neutral

- We can add a GraphQL gateway later if a use case appears. Nothing in this
  decision prevents it.

## Alternatives considered

### Option A: tRPC

Rejected. Excellent for tightly coupled TS-to-TS apps, but locks out non-TS
clients and undersells our OpenAPI-first goal.

### Option B: GraphQL

Rejected. Too much ceremony for a small personal app, and the data shape is
better expressed by REST + a few `?include=...` patterns when needed.

### Option C: REST with class-validator / class-transformer (NestJS default)

Rejected. Decorators duplicate the Zod schema we already need for the shared
package and the web client. One source of truth wins.
