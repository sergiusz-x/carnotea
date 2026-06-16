# Tech stack reference

A flat list of every tool we use, with one-liners explaining what it is and a
link to the ADR (when one exists). Use this page as a quick map - the details
live in the linked documents.

## Monorepo / tooling

| Tool             | Purpose                                               | Notes                                                                                                 |
| ---------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| pnpm             | Workspaces, fast installs, content-addressed store    | required >= 9; shared versions in the `catalog`                                                       |
| pnpm catalog     | Single source of truth for shared dependency versions | `pnpm-workspace.yaml`                                                                                 |
| Turborepo        | Task graph, caching, parallel runs                    | [ADR-0001](./adr/0001-monorepo-turborepo.md)                                                          |
| Turbo generators | Scaffold new packages from templates (`turbo gen`)    | T-016                                                                                                 |
| TypeScript       | Strict types everywhere                               | `tsconfig.base.json` + `@carnotea/tsconfig`; [ADR-0009](./adr/0009-shared-tooling-config-packages.md) |
| ESLint           | Linting                                               | `@carnotea/eslint-config` flat configs; [ADR-0009](./adr/0009-shared-tooling-config-packages.md)      |
| Prettier         | Formatting                                            | `@carnotea/prettier-config`; [ADR-0009](./adr/0009-shared-tooling-config-packages.md)                 |
| sherif           | Workspace dependency-consistency linter               | `pnpm lint:ws`, runs on postinstall; ignores empty app/package globs until scaffold tickets land      |
| Vitest           | Unit / integration tests                              | `@carnotea/vitest-config` base config; [ADR-0009](./adr/0009-shared-tooling-config-packages.md)       |
| Playwright       | End-to-end tests                                      |                                                                                                       |
| Changesets       | Versioning, changelogs                                | T-013                                                                                                 |
| commitlint       | Conventional Commits enforcement                      | T-013                                                                                                 |
| lefthook         | Git hooks                                             | T-013                                                                                                 |
| GitHub Actions   | CI: lint, typecheck, test, build                      | T-015                                                                                                 |

## Database

| Tool             | Purpose                             | Notes                                            |
| ---------------- | ----------------------------------- | ------------------------------------------------ |
| PostgreSQL 16    | Primary store                       | docker-compose                                   |
| Drizzle ORM      | Query builder, typed schema-as-code | [ADR-0002](./adr/0002-drizzle-schema-as-code.md) |
| drizzle-kit      | Migration generator + runner        | dev tooling only, not shipped                    |
| postgres (pg.js) | Postgres driver for drizzle-orm     | `@carnotea/db` dependency                        |
| @carnotea/db     | Drizzle schema + `createDb` factory | `packages/db/`; see `packages/db/AGENTS.md`      |

## Backend (apps/api)

| Tool                           | Purpose                               | Notes                                      |
| ------------------------------ | ------------------------------------- | ------------------------------------------ |
| NestJS                         | HTTP framework, DI, module structure  | `apps/api`; T-004                          |
| Fastify adapter                | Faster HTTP layer under NestJS        | adopted in T-004                           |
| SWC                            | Compiler for `apps/api` (dev/build)   | [ADR-0010](./adr/0010-api-compiler-swc.md) |
| @nestjs/config                 | Env loading, validated by Zod         | `src/config/env.ts`                        |
| Zod                            | Validation, schema source             | [ADR-0003](./adr/0003-rest-openapi-zod.md) |
| @asteasolutions/zod-to-openapi | Generate OpenAPI 3.1 from Zod schemas | T-005; ADR-0003                            |
| better-auth                    | Authentication                        | [ADR-0004](./adr/0004-better-auth.md)      |
| nestjs-pino / pino             | Structured logging                    | `pino-pretty` in non-prod                  |
| @carnotea/db                   | Drizzle client + schema               | workspace package                          |
| @carnotea/shared               | Zod schemas, shared types             | workspace package                          |

## Frontend (apps/web)

| Tool                    | Purpose                          | Notes                                          |
| ----------------------- | -------------------------------- | ---------------------------------------------- |
| React 18                | UI framework                     | [ADR-0005](./adr/0005-vite-react-no-nextjs.md) |
| Vite                    | Build + dev server               |                                                |
| TanStack Router         | Routing                          | file-based or code-based, TBD in T-009         |
| TanStack Query          | Server-state caching             |                                                |
| Tailwind CSS            | Utility CSS                      |                                                |
| shadcn/ui               | Copy-paste accessible components |                                                |
| react-hook-form         | Forms                            |                                                |
| Zod                     | Form + API validation            | [ADR-0003](./adr/0003-rest-openapi-zod.md)     |
| i18next + react-i18next | i18n                             | [ADR-0007](./adr/0007-i18n-pl-en.md)           |
| Workbox                 | Service worker for PWA           | [ADR-0006](./adr/0006-pwa-from-day-one.md)     |
| openapi-typescript      | Typed API client from `/docs`    | T-011                                          |

## Shared (packages/shared)

| Thing                | Purpose                                      |
| -------------------- | -------------------------------------------- |
| Zod schemas          | Request / response / domain shapes           |
| TS types             | Inferred from Zod where possible             |
| Constants            | E.g. fuel type codes, expense category codes |
| Pure utility helpers | Currency formatting, mileage parsing         |

## Infra

| Thing          | Purpose                              |
| -------------- | ------------------------------------ |
| docker compose | Local Postgres now; full stack later |
| GitHub Actions | CI (later)                           |
| VPS            | Production hosting                   |

If you add a dependency to any app or package, update this page in the same PR.
