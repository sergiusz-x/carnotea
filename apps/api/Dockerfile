# syntax=docker/dockerfile:1
# =============================================================================
# CarNotea API — production container image
# Multi-stage build: builder (full workspace) → runner (pruned prod tree)
# =============================================================================

# ---- Stage 1: Build the monorepo -------------------------------------------
FROM node:22-slim AS builder

# Install git (needed for build-version scripts) and Corepack for pnpm
RUN apt-get update \
 && apt-get install -y --no-install-recommends git \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copy workspace manifest files first (layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY tooling/eslint/package.json     tooling/eslint/package.json
COPY tooling/prettier/package.json   tooling/prettier/package.json
COPY tooling/typescript/package.json tooling/typescript/package.json
COPY tooling/vitest/package.json     tooling/vitest/package.json

# Install ALL dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Copy the rest of the source tree
COPY . .

# Build the API and its workspace dependencies
# Force fetch tags from public repo so git-version-gen has tags even if Dokploy cloned without them
RUN git fetch --tags https://github.com/sergiusz-x/carnotea.git || true
RUN pnpm --filter @carnotea/api... build

# Deploy a pruned production tree into /app/out
RUN pnpm deploy --filter @carnotea/api --prod /app/out


# ---- Stage 2: Slim runtime image -------------------------------------------
FROM node:22-slim AS runner

# Corepack still needed at runtime: the migrate service's command runs
# `pnpm --filter @carnotea/db db:deploy`. COREPACK_HOME must be set before
# `corepack prepare` runs (as root, here) AND be readable by the `carnotea`
# user at runtime — otherwise corepack's shim can't find the pnpm it already
# prepared, tries to re-download it as `carnotea`, and fails with EACCES
# writing to the default (root-owned) cache path.
ENV COREPACK_HOME=/app/.corepack

RUN groupadd --system --gid 1001 carnotea && \
    useradd --system --uid 1001 -g carnotea --home-dir /app --shell /sbin/nologin carnotea && \
    mkdir -p /app && \
    corepack enable && corepack prepare pnpm@9.12.0 --activate && \
    chown -R carnotea:carnotea /app/.corepack

WORKDIR /app

# Copy the pruned production tree (--chown sets ownership per-file during the
# copy itself; a separate `RUN chown -R` afterward was a full recursive stat+
# chown pass over ~1000 node_modules entries, taking ~110s on its own)
COPY --from=builder --chown=carnotea:carnotea /app/out /app

# Overlay the compiled dist/ output on top of the deployed tree
COPY --from=builder --chown=carnotea:carnotea /app/apps/api/dist /app/apps/api/dist

USER carnotea

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "--import", "./apps/api/dist/instrumentation.js", "apps/api/dist/main.js"]
