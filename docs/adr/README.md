# Architecture Decision Records

An ADR records a single decision that shapes the project, why it was made, and
what the trade-offs are. Once accepted, an ADR is immutable - if reality changes,
write a new ADR that supersedes the old one.

## Format

Use [`_template.md`](./_template.md) as the starting point. Each ADR has:

- A short title (the decision, not the topic).
- A status: `proposed`, `accepted`, `superseded by ADR-XXXX`, or `deprecated`.
- A date.
- Context (one or two paragraphs - what is the situation?).
- Decision (what did we decide? one paragraph).
- Consequences (what becomes easier? what becomes harder? what do we owe in
  exchange?).
- (Optional) Alternatives considered.

## Naming

`NNNN-kebab-case-title.md` where `NNNN` is the next free number, zero-padded.
Numbers are monotonic - no gaps, no reuse.

## When to write one

Write an ADR if any of these apply:

- You're adding a top-level dependency that other code will couple to (a
  framework, an ORM, an auth provider, a test runner).
- You're choosing a pattern that the rest of the codebase will follow (e.g.
  "REST over tRPC", "Zod over class-validator").
- You're reversing a previous decision.
- You're answering a question that came up *because the team disagreed*.

Don't write one for:

- Minor library upgrades.
- Internal refactors that don't change the public shape of a module.
- Bug fixes.

## Index

| ID  | Title                                            | Status   |
| --- | ------------------------------------------------ | -------- |
| [0001](./0001-monorepo-turborepo.md) | Monorepo with pnpm workspaces and Turborepo | accepted |
| [0002](./0002-drizzle-schema-as-code.md) | Drizzle as source of truth; schema in TypeScript | accepted |
| [0003](./0003-rest-openapi-zod.md) | REST API with OpenAPI generated from Zod | accepted |
| [0004](./0004-better-auth.md) | better-auth for authentication | accepted |
| [0005](./0005-vite-react-no-nextjs.md) | Vite + React (no Next.js) for the web app | accepted |
| [0006](./0006-pwa-from-day-one.md) | PWA from day one, advanced features later | accepted |
| [0007](./0007-i18n-pl-en.md) | i18n with Polish and English from the first screen | accepted |
| [0008](./0008-tickets-as-markdown.md) | Tickets live as markdown files in the repo | accepted |
