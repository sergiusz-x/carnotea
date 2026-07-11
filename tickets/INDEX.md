# Tickets index

A view of what is planned, in progress, and done. The **source of truth is each
ticket's `status` frontmatter**, not this file — the list below is generated.
Change a ticket's status in its own file, then run `pnpm tickets:index` to
regenerate this list. Do not hand-edit between the markers.

Legend: `🔴` high · `🟡` medium · `🟢` low

<!-- BEGIN GENERATED:tickets — edit ticket frontmatter, then run `pnpm tickets:index` -->

## Ready

These tickets are fully specced. An agent picks the first one whose `dependencies`
are all `done` — use `/next-ticket` (Claude Code) or the `next-ticket` skill (Codex).

- 🟢 [T-014 — Infra — dev docker-compose for full stack](./T-014-infra-dev-docker-compose.md)
- 🟢 [T-016 — Turborepo generators — scaffold new packages](./T-016-turbo-generators.md)
- 🟢 [T-030 — Audit-logging interceptor for mutating actions](./T-030-api-audit-logging.md)
- 🟡 [T-042 — End-to-end tests with Playwright for the critical path](./T-042-e2e-playwright.md)
- 🟡 [T-043 — Accessibility pass across the web app](./T-043-accessibility-audit.md)
- 🟢 [T-044 — Performance budget + Lighthouse and bundle-size CI check](./T-044-performance-budget-lighthouse.md)
- 🟡 [T-050 — OpenTelemetry metrics + basic alerting (follow-up to T-018)](./T-050-metrics-alerting.md)
- 🟡 [T-053 — Privacy Policy and Terms of Service pages](./T-053-legal-privacy-terms.md)
- 🟢 [T-054 — PWA offline-first caching and queued-mutation sync](./T-054-pwa-offline-sync.md)
- 🟡 [T-055 — Web Push notifications for due reminders](./T-055-pwa-push-notifications.md)

## Backlog

- 🟡 [T-066 — Vehicle form VIN lookup autofill](./T-066-vehicle-vin-lookup-autofill.md)
- 🟡 [T-075 — Web — mobile polish, quick-add alignment, and accessibility pass](./T-075-web-mobile-polish-and-a11y.md)

## In progress

- 🔴 [T-046 — Continuous deployment with safe release-step migrations](./T-046-cd-deploy-migrate.md)
- 🟡 [T-068 — Electric dashboard labels, nav visibility, and mileage defaults](./T-068-electric-dashboard-nav-and-mileage-defaults.md)
- 🔴 [T-069 — 'Redesign epic — Cockpit panel + unified Dziennik feed'](./T-069-redesign-cockpit-logbook.md)
- 🔴 [T-073 — Web — vehicle panel and activity feed](./T-073-web-panel-and-activity-feed.md)
- 🔴 [T-074 — Web — shell rail and dashboard composition](./T-074-web-shell-and-dashboard-composition.md)
- 🟢 [T-076 — Web logo refresh - minimalist E2 mark](./T-076-web-logo-refresh-e2.md)
- 🔴 [T-077 — 'Web — apply the instrument-cluster design system to forms, detail pages, profile, and vehicle hub'](./T-077-web-design-system-consistency-pass.md)
- 🔴 [T-086 — 'Web — mobile vehicle switching, StatStrip wrap, trend label, and textarea fields'](./T-086-web-mobile-vehicle-switch-and-ui-fixes.md)

## Blocked

_None._

## In review

- 🔴 [T-090 — Show deployed web build version and release metadata](./T-090-web-build-version-visibility.md)

## Done

- 🔴 [T-001 — Bootstrap tooling and shared configs](./T-001-bootstrap-tooling-and-shared-configs.md)
- 🔴 [T-002 — Database package — Drizzle schema-as-code + migrations](./T-002-database-package-drizzle-introspect.md)
- 🔴 [T-003 — Shared package — Zod schemas and types](./T-003-shared-package-zod-and-types.md)
- 🔴 [T-004 — API skeleton — NestJS app + healthcheck + DB ping](./T-004-api-nestjs-skeleton.md)
- 🟡 [T-005 — API — OpenAPI / Swagger generated from Zod](./T-005-api-openapi-swagger-from-zod.md)
- 🔴 [T-006 — Auth — better-auth integration + user-profile linkage](./T-006-auth-better-auth-integration.md)
- 🔴 [T-007 — Web skeleton — Vite + React + TS](./T-007-web-vite-react-skeleton.md)
- 🟡 [T-008 — Web — Tailwind + shadcn/ui setup](./T-008-web-tailwind-shadcn.md)
- 🟡 [T-009 — Web — TanStack Router + TanStack Query](./T-009-web-tanstack-router-query.md)
- 🟡 [T-010 — Web — i18n (pl + en) with i18next](./T-010-web-i18n-pl-en.md)
- 🟡 [T-011 — Web — typesafe API client from OpenAPI](./T-011-web-typesafe-api-client.md)
- 🟡 [T-012 — Web — PWA manifest + minimal service worker](./T-012-web-pwa-installable.md)
- 🟢 [T-013 — Tooling — Changesets + Conventional Commits + commitlint](./T-013-tooling-changesets-commitlint.md)
- 🔴 [T-015 — CI — GitHub Actions (lint, typecheck, test, build)](./T-015-ci-github-actions.md)
- 🟡 [T-017 — Add /smart-commit slash command and Codex skill](./T-017-smart-commit.md)
- 🟡 [T-018 — Observability baseline — OpenTelemetry tracing across api + web](./T-018-observability-opentelemetry-baseline.md)
- 🔴 [T-019 — Shared — canonical domain Zod schemas + inferred types](./T-019-shared-domain-zod-schemas.md)
- 🔴 [T-020 — API — Vehicles CRUD (user-scoped, OpenAPI)](./T-020-api-vehicles-crud.md)
- 🟡 [T-021 — API — Mileage readings + odometer sync rule](./T-021-api-mileage-readings-sync.md)
- 🔴 [T-022 — API — Fuel logs (refuels) CRUD](./T-022-api-fuel-logs.md)
- 🟡 [T-023 — API — Charging sessions CRUD](./T-023-api-charging-sessions.md)
- 🟡 [T-024 — API — Service records + parts CRUD](./T-024-api-service-records-parts.md)
- 🟡 [T-025 — API — Issues CRUD (status, priority, resolved-date invariant)](./T-025-api-issues.md)
- 🟡 [T-026 — Expenses CRUD + automatic cost sync from fuel/charge/service](./T-026-api-expenses-cost-sync.md)
- 🟡 [T-027 — Reminders CRUD with date/mileage triggers and status transitions](./T-027-api-reminders.md)
- 🟡 [T-028 — Dashboard and analytics read endpoints](./T-028-api-dashboard-analytics.md)
- 🟡 [T-029 — User profile endpoints linked to better-auth identity](./T-029-api-user-profile.md)
- 🔴 [T-031 — Web forms foundation — react-hook-form + Zod resolver + fields](./T-031-web-forms-foundation.md)
- 🔴 [T-032 — Web app shell — auth guard, login/logout, nav, layout](./T-032-web-app-shell-auth.md)
- 🔴 [T-033 — Web vehicles screens — list, detail hub, create/edit/delete](./T-033-web-vehicles-screens.md)
- 🟡 [T-034 — Web fuel-log screens under a vehicle](./T-034-web-fuel-logs-screens.md)
- 🟡 [T-035 — Web charging-session screens under a vehicle](./T-035-web-charging-sessions-screens.md)
- 🟡 [T-036 — Web service-record screens with linked parts](./T-036-web-service-records-screens.md)
- 🟡 [T-037 — Web issue screens with priority, status, and resolved date](./T-037-web-issues-screens.md)
- 🟡 [T-038 — Web expense screens with categories and auto-sync indicator](./T-038-web-expenses-screens.md)
- 🟡 [T-039 — Web reminder screens with due/mileage triggers and status](./T-039-web-reminders-screens.md)
- 🟡 [T-040 — Web home dashboard with cost, consumption, reminders, activity](./T-040-web-dashboard-screen.md)
- 🟡 [T-041 — Web profile and settings screen (locale, units, currency, account)](./T-041-web-profile-settings-screen.md)
- 🔴 [T-045 — Production container images + docker compose with TLS reverse proxy](./T-045-prod-docker-compose-proxy.md)
- 🟡 [T-047 — Automated Postgres backups + tested restore runbook](./T-047-postgres-backup-restore.md)
- 🟡 [T-048 — Production secrets handling for the deployed stack](./T-048-secrets-management.md)
- 🔴 [T-049 — API + web security hardening for production](./T-049-security-hardening.md)
- 🔴 [T-051 — Transactional email for better-auth flows (verification + password reset)](./T-051-transactional-email.md)
- 🔴 [T-052 — GDPR data export and account deletion](./T-052-gdpr-export-delete.md)
- 🔴 [T-056 — Spec-driven ticket template + Definition of Ready](./T-056-spec-driven-template-dor.md)
- 🔴 [T-057 — Resource-CRUD API pattern + rewrite API tickets to delta specs](./T-057-resource-crud-pattern-api-tickets.md)
- 🔴 [T-058 — Web-screens pattern + rewrite web tickets to delta specs](./T-058-web-screens-pattern-web-tickets.md)
- 🟡 [T-059 — Ticket-spec linter + CI gate](./T-059-ticket-linter-ci.md)
- 🟡 [T-060 — Generate INDEX.md from frontmatter to end status-move merge conflicts](./T-060-tickets-index-generated.md)
- 🔴 [T-061 — Make derived-sync seams transaction-composable and source writes atomic](./T-061-atomic-derived-sync-seam.md)
- 🟡 [T-062 — Remove legacy sql/ + tests/ and fix the stale architecture data-flow](./T-062-remove-legacy-sql-fix-architecture-doc.md)
- 🔴 [T-063 — Align API paths, vehicle energy invariant, and README](./T-063-api-prefix-energy-invariant-readme-cleanup.md)
- 🔴 [T-065 — Pre-push CI validation](./T-065-pre-push-ci-validation.md)
- 🔴 [T-067 — Active-vehicle UX refactor — global picker, functional nav, mobile bottom bar, FAB](./T-067-active-vehicle-ux-refactor.md)
- 🔴 [T-070 — 'Shared schemas — ActivityEntry feed + VehiclePanel vitals'](./T-070-shared-activity-panel-schemas.md)
- 🔴 [T-071 — API — vehicle activity feed endpoint](./T-071-api-vehicle-activity-feed.md)
- 🔴 [T-072 — API — vehicle panel endpoint](./T-072-api-vehicle-panel.md)
- 🟡 [T-078 — Web profile language preference save regression](./T-078-web-profile-language-preference-save.md)
- 🔴 [T-079 — 'Web — shared ListCard/StatStrip primitives and instrument-cluster design tokens'](./T-079-web-shared-listcard-design-foundation.md)
- 🔴 [T-080 — Fix main CI after docker-compose merge](./T-080-fix-main-ci-after-docker-compose-merge.md)
- 🔴 [T-081 — Fix API Docker workspace dependency build](./T-081-fix-api-docker-workspace-dependency-build.md)
- 🔴 [T-082 — Fix Web Docker workspace manifest paths](./T-082-fix-web-docker-workspace-manifest-paths.md)
- 🔴 [T-083 — Skip deploy job when production secrets are missing](./T-083-skip-deploy-job-when-production-secrets-are-missing.md)
- 🔴 [T-084 — Route deploy secret check through job output](./T-084-route-deploy-secret-check-through-job-output.md)
- 🟡 [T-085 — Remove obsolete VPS deploy workflow](./T-085-remove-obsolete-vps-deploy-workflow.md)
- 🟡 [T-087 — Automated SemVer releases via semantic-release](./T-087-automated-semver-releases.md)
- 🟡 [T-088 — API — Operating fluid changes (fluid logs) CRUD](./T-088-api-fluid-logs.md)
- 🔴 [T-089 — Fix invalid profile names in /api/me provisioning](./T-089-fix-profile-provisioning-invalid-names.md)
- 🟢 [T-091 — Move web version badge into profile](./T-091-web-version-badge-profile.md)
- 🔴 [T-092 — Fix version.json service worker caching](./T-092-version-json-service-worker-cache.md)

<!-- END GENERATED:tickets -->

---

## Conventions

- Ids are monotonic and zero-padded: `T-001`, `T-002`, ..., `T-099`, `T-100`.
- A ticket id is never reused, even if the ticket is dropped (mark it
  `status: deleted` in the file and move the line to "Done" with a note).
- A ticket file is never deleted. The historical record stays.
- A ticket's status lives in its frontmatter; this index is generated from it.
  Change the status in the ticket file and run `pnpm tickets:index` in the
  **same commit / PR**. `pnpm lint:tickets` (CI) fails if the two disagree.
