---
id: T-065
title: Pre-push CI validation
status: done
priority: high
dependencies: []
description: Added local CI validation script, husky pre-push hook, and agent workflow docs so coding agents catch failures before pushing PRs.
created_at: 2026-06-21
updated_at: 2026-06-21
---

# T-065 — Pre-push CI validation

## Goal

Prevent CI failures on PRs by running the full validation suite locally before a push is made, both for human and agent-driven development.

## Context

PRs frequently fail CI checks (lint, typecheck, format, tests, ticket lint) that could have been caught locally before pushing. This creates unnecessary CI churn, slows down review cycles, and is especially wasteful for agent-driven development where a full local validation loop is cheap. The fix combines a local CI script, a husky pre-push hook, and docs so coding agents know the expected workflow.

## Acceptance criteria

- [x] A `pnpm local:ci` script runs lint, typecheck, format:check, and test suites in sequence.
- [x] Husky pre-push hook triggers `pnpm local:ci` so pushes are blocked on local validation failure.
- [x] Agent workflow docs (`docs/agents/`) describe the pre-push validation workflow so coding agents follow it reliably.
- [x] `pnpm lint:tickets` passes on this ticket file.
