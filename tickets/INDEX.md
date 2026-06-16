# Tickets index

The single source of truth for what is planned, in progress, and done. Each
line links to the ticket file and shows its priority. Update this file in the
**same PR** as any ticket status change.

Legend: `🔴` high · `🟡` medium · `🟢` low

## Ready

These tickets are fully specced. An agent picks the first one whose `dependencies`
are all `done` — use `/next-ticket` (Claude Code) or the `next-ticket` skill (Codex).

- 🟡 [T-005 — API: OpenAPI / Swagger generated from Zod](./T-005-api-openapi-swagger-from-zod.md)
- 🔴 [T-006 — Auth: better-auth integration + user-profile linkage](./T-006-auth-better-auth-integration.md)
- 🟡 [T-009 — Web: TanStack Router + TanStack Query](./T-009-web-tanstack-router-query.md)
- 🟡 [T-010 — Web: i18n (pl + en) with i18next](./T-010-web-i18n-pl-en.md)
- 🟡 [T-011 — Web: typesafe API client from OpenAPI](./T-011-web-typesafe-api-client.md)
- 🟡 [T-012 — Web: PWA manifest + minimal service worker](./T-012-web-pwa-installable.md)
- 🟢 [T-013 — Tooling: Changesets + Conventional Commits + commitlint](./T-013-tooling-changesets-commitlint.md)
- 🟢 [T-014 — Infra: dev docker-compose for full stack](./T-014-infra-dev-docker-compose.md)
- 🟡 [T-015 — CI: GitHub Actions (lint, typecheck, test, build)](./T-015-ci-github-actions.md)
- 🟢 [T-016 — Turborepo generators: scaffold new packages](./T-016-turbo-generators.md)

## Backlog

_Empty for now. New ideas land here before they are refined into `ready`._

## In progress

_Empty._

## Blocked

_Empty._

## In review

_Empty._

## Done

- 🟡 [T-008 — Web: Tailwind + shadcn/ui setup](./T-008-web-tailwind-shadcn.md)
- 🔴 [T-007 — Web skeleton: Vite + React + TS](./T-007-web-vite-react-skeleton.md)
- 🔴 [T-001 — Bootstrap tooling and shared configs](./T-001-bootstrap-tooling-and-shared-configs.md)
- 🔴 [T-002 — Database package: Drizzle schema-as-code + migrations](./T-002-database-package-drizzle-introspect.md)
- 🔴 [T-003 — Shared package: Zod schemas and types](./T-003-shared-package-zod-and-types.md)
- 🔴 [T-004 — API skeleton: NestJS app + healthcheck + DB ping](./T-004-api-nestjs-skeleton.md)
- 🟡 [T-017 — Add /smart-commit slash command and Codex skill](./T-017-smart-commit.md)

---

## Conventions

- Ids are monotonic and zero-padded: `T-001`, `T-002`, ..., `T-099`, `T-100`.
- A ticket id is never reused, even if the ticket is dropped (mark it
  `status: deleted` in the file and move the line to "Done" with a note).
- A ticket file is never deleted. The historical record stays.
- When a ticket's status changes, update both the ticket frontmatter and the
  line in this index in the **same commit / PR**.
