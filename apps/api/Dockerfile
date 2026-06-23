# =============================================================================
# CarNotea API — production multi-stage Docker image
# =============================================================================
# Build:  docker build -f apps/api/Dockerfile -t carnotea-api .
# Run:    docker run --rm -p 3001:3001 carnotea-api
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — install ALL dependencies (including devDeps needed for build)
# ---------------------------------------------------------------------------
FROM node:22-slim AS deps

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable
WORKDIR /app

# Copy only dependency manifests first — Docker layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json        apps/api/package.json
COPY packages/db/package.json     packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY tooling/                     tooling/

RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2 — compile app + workspace packages
# ---------------------------------------------------------------------------
FROM node:22-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable
WORKDIR /app

COPY --from=deps /app /app
COPY . .

RUN pnpm --filter @carnotea/api build

# ---------------------------------------------------------------------------
# Stage 3 — prune to production dependencies only
# ---------------------------------------------------------------------------
FROM node:22-slim AS prod-deps

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm deploy --filter @carnotea/api --prod /app/runtime

# ---------------------------------------------------------------------------
# Stage 4 — slim runtime image
# ---------------------------------------------------------------------------
FROM node:22-slim

RUN corepack enable
WORKDIR /app

# Copy pruned production workspace (node_modules, package.json, workspace pkgs)
COPY --from=prod-deps /app/runtime /app

# Copy compiled build artifacts
COPY --from=builder /app/apps/api/dist     /app/apps/api/dist
COPY --from=builder /app/packages/db/dist  /app/packages/db/dist
COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist

# Create non-root user
RUN addgroup --system --gid 1001 appuser \
    && adduser --system --uid 1001 appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "apps/api/dist/main.js"]