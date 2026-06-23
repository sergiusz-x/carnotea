#!/usr/bin/env bash
set -euo pipefail
echo "==> Running local CI validation..."

echo "→ pnpm format:check"
pnpm format:check

echo "→ pnpm lint"
pnpm lint

echo "→ pnpm typecheck"
pnpm typecheck

echo "→ pnpm build"
pnpm build

echo "→ pnpm test"
pnpm test

echo "✅ All local CI checks passed!"
