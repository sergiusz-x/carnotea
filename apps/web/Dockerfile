# =============================================================================
# CarNotea Web — production multi-stage Docker image
# =============================================================================
# Build:  docker build -f apps/web/Dockerfile -t carnotea-web .
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1 — install dependencies
# ---------------------------------------------------------------------------
FROM node:22-slim AS deps

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json     apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY tooling/                  tooling/

RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2 — build Vite static bundle
# ---------------------------------------------------------------------------
FROM node:22-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
RUN corepack enable
WORKDIR /app

COPY --from=deps /app /app
COPY . .

# Build-time VITE_* env vars — override at build time, e.g.:
#   docker build --build-arg VITE_API_URL=https://example.com/api ...
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter @carnotea/web build

# ---------------------------------------------------------------------------
# Stage 3 — static file server (nginx)
# ---------------------------------------------------------------------------
FROM nginx:alpine

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Minimal nginx config for SPA
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/cache/nginx \
    && chown -R appuser:appgroup /var/run \
    && touch /var/run/nginx.pid \
    && chown appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]