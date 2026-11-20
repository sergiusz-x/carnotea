---
id: T-110
title: Refresh vulnerable dependencies and container images
status: in_progress
priority: high
size: L
spec_version: 1
owner: codex
dependencies: []
labels: [security, dependencies]
created_at: 2026-11-19
updated_at: 2026-11-19
closed_at: ~
---

# T-110 — Refresh vulnerable dependencies and container images

## Goal

Update vulnerable container images and dependencies while preserving application behavior and existing data.

## Context

The production images use Node 22 and nginx 1.27, and the production dependency audit reports high and critical advisories.

## Contract

### Endpoints / routes

_n/a — existing routes remain compatible._

### Request / response shapes

_n/a — existing contracts remain compatible._

### Provides

Patched images and a regenerated dependency lockfile.

### Consumes

Existing workspace manifests and database migrations.

## Acceptance criteria

- [ ] Images and vulnerable dependencies are updated to compatible stable releases.
- [ ] Production audit, workspace checks, builds and tests pass.
- [x] Existing auth data and application flows are verified with a disposable database.
- [ ] Applicable breaking changes and remaining issues are documented.

## Test matrix

| Case           | Input                              | Expected                            |
| -------------- | ---------------------------------- | ----------------------------------- |
| Authentication | Synthetic user and existing schema | Signup and login succeed            |
| Security       | Production dependency audit        | No high or critical vulnerabilities |
| Images         | Local build and startup            | Existing routes respond             |

## Files to touch

- Container Dockerfiles, workspace manifests and lockfile.
- Source or tests only when required for compatibility.

## Out of scope

- Production deployment or production data changes.

## Implementation notes

Node 24.22.3 and nginx 1.30.7 contain security fixes. NestJS 11.2.11 changes `*path` middleware matching; the application does not use this syntax. Better Auth 1.7.3 and later retain the 1.6 account schema; duplicate provider/account keys must be checked before deployment. See the [upgrade guide](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/guides/1-7-upgrade-guide.mdx). Nodemailer 10 requires Node 20 and ships its own types. OpenTelemetry API is pinned to 1.9.1 to satisfy current peer ranges and avoid duplicate Drizzle types.

OpenTelemetry auto-instrumentations 0.80 and SDK 0.222 retain compatibility with API 1.9 and remove the previously reported instrumentation advisories. The exporter version is aligned across API and web. Lighthouse CI 0.16.1 upgrades Lighthouse and its proxy dependencies. The full workspace audit still reports four high and seven moderate findings: extract-zip, basic-ftp, and Zod through the size-limit/estimo browser toolchain, plus glob and minimatch. Extract-zip has no patched release in the advisory; replacing or upgrading the consuming toolchain must preserve its existing performance checks. The GCP detector and ESLint still depend on vulnerable glob or minimatch versions. Do not force incompatible majors without validation.

The API instrumentation module initialized with an enabled local exporter, API typecheck passed, and Lighthouse CI reported version 0.16.1. The complete application start, Lighthouse run, and final container builds remain to be checked. A size-limit run in the sandbox failed because spawning the browser discovery shell was blocked. Local disk space reached approximately 2 GB, so further builds require sufficient free space.

## Verification

- Run workspace lint, format, typecheck, build and tests.
- Run the production dependency audit.
- Exercise authentication against a disposable PostgreSQL database.
- Build and exercise the container images locally.

## References

- [Node 24.22.3](https://nodejs.org/en/blog/release/v24.22.3/)
- [nginx changes](https://nginx.org/en/CHANGES-1.30)
- [NestJS releases](https://github.com/nestjs/nest/releases)
- [Fastify releases](https://github.com/fastify/fastify/releases)
- [Better Auth upgrade guide](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/guides/1-7-upgrade-guide.mdx)
- [Nodemailer changelog](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md)

- [OpenTelemetry auto-instrumentations changelog](https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/auto-instrumentations-node/CHANGELOG.md)
- [Vitest releases](https://github.com/vitest-dev/vitest/releases)
