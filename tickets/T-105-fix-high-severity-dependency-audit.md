---
id: T-105
title: Fix high-severity transitive dependency advisories
status: in_progress
priority: high
size: S
spec_version: 1
owner: codex
dependencies: []
labels: [security, dependencies, ci]
created_at: 2026-07-28
updated_at: 2026-08-28
closed_at: ~
---

# T-105 — Fix high-severity transitive dependency advisories

## Goal

Restore the required production dependency-audit check by resolving the patched `find-my-way` and `brace-expansion` transitive versions without changing application behavior.

## Context

The required `pnpm audit --prod --audit-level=high` check reports GHSA-c96f-x56v-gq3h for `find-my-way <=9.6.0` and GHSA-mh99-v99m-4gvg for `brace-expansion <=5.0.7`. On 2026-07-28, package-manager metadata reports patched stable versions `find-my-way@9.7.0` and `brace-expansion@5.0.8`; current direct parents `fastify@5.10.0` and `@nestjs/platform-fastify@11.1.28` have no newer stable release. The existing root override policy already pins patched transitive `brace-expansion` ranges, making narrow additional overrides the smallest compatible fix.

This restores the audit gate introduced by [T-049](./T-049-security-hardening.md) and unblocks PR #171. The same CI run exposed a nondeterministic activity integration fixture, which is included here because both fixes are required to merge the release PR.

## Contract

### Endpoints / routes

_n/a — dependency resolution only; no HTTP contract changes._

### Request / response shapes

_n/a — no runtime schema changes._

### Provides

- Root pnpm overrides resolving every `find-my-way` instance to `9.7.0` and every vulnerable `brace-expansion` 5.x instance to `5.0.8`.
- Regenerated `pnpm-lock.yaml` produced by pnpm, not edited by hand.
- A green `pnpm audit --prod --audit-level=high`.

### Consumes

- Existing root `pnpm.overrides` policy in `package.json`.
- Existing Fastify/NestJS catalog versions and production audit workflow from T-049.

## Acceptance criteria

- [ ] `pnpm audit --prod --audit-level=high` exits 0 and no longer reports GHSA-c96f-x56v-gq3h or GHSA-mh99-v99m-4gvg.
- [ ] The lockfile resolves `find-my-way` to `9.7.0` and vulnerable 5.x `brace-expansion` paths to `5.0.8`.
- [ ] Existing safe `brace-expansion` 1.x and 2.x overrides remain unchanged.
- [ ] `pnpm install --lockfile-only` completes without peer-dependency or resolution errors.
- [ ] API lint, typecheck, tests, and build pass with the patched router dependency.
- [ ] The activity integration test uses distinct dates and passes with the CI database.
- [ ] No application source, public API contract, database schema, environment variable, or user-facing behavior changes.

## Test matrix

| Case               | Input                       | Expected                                      |
| ------------------ | --------------------------- | --------------------------------------------- |
| router advisory    | production dependency audit | no vulnerable `find-my-way <=9.6.0`           |
| expansion advisory | production dependency audit | no vulnerable `brace-expansion <=5.0.7`       |
| lock resolution    | `pnpm why find-my-way`      | only patched 9.7.0 resolution                 |
| lock resolution    | `pnpm why brace-expansion`  | every path resolves to advisory-patched 5.0.8 |
| API regression     | API test/build suite        | all pass with no source change                |

## Files to touch

- `package.json`
- `pnpm-lock.yaml`
- `apps/api/src/activity/activity.integration.test.ts`
- `tickets/T-105-fix-high-severity-dependency-audit.md`
- `tickets/INDEX.md`

## Out of scope

- Upgrading Fastify, NestJS, ESLint, OpenTelemetry, or unrelated packages.
- Waiving or lowering the audit threshold.
- Application or API refactors.

## Implementation notes

Add the narrow overrides `find-my-way@<9.7.0: 9.7.0` and `brace-expansion@>=5.0.0 <5.0.8: 5.0.8`, then regenerate the lockfile with pnpm. Do not hand-edit `pnpm-lock.yaml`. If pnpm reports an incompatibility, stop and revise the ticket rather than forcing a wider upgrade.

## Verification

- `pnpm install --lockfile-only` → completes successfully.
- `pnpm audit --prod --audit-level=high` → exits 0.
- `pnpm why find-my-way && pnpm why brace-expansion` → only patched vulnerable ranges remain.
- `pnpm --filter @carnotea/api lint` → passes.
- `pnpm --filter @carnotea/api typecheck` → passes.
- `pnpm --filter @carnotea/api test` → passes.
- `pnpm --filter @carnotea/api build` → passes.
- `pnpm lint:tickets` → ticket index and contract pass.

## References

- Security audit gate: [T-049](./T-049-security-hardening.md)
- GitHub advisories: GHSA-c96f-x56v-gq3h, GHSA-mh99-v99m-4gvg
- Package manifests: [`package.json`](../package.json), [`pnpm-workspace.yaml`](../pnpm-workspace.yaml)
