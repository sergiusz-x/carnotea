# syntax=docker/dockerfile:1
# =============================================================================
# CarNotea Web — production container image
# Multi-stage build: builder (Vite static bundle) → runtime (nginx:alpine)
# =============================================================================

# ---- Stage 1: Build the static bundle --------------------------------------
FROM node:22-slim AS builder

RUN apt-get update \
 && apt-get install -y --no-install-recommends git \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable \
 && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copy workspace manifest files first (layer caching)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY tooling/eslint/package.json     tooling/eslint/package.json
COPY tooling/prettier/package.json   tooling/prettier/package.json
COPY tooling/typescript/package.json tooling/typescript/package.json
COPY tooling/vitest/package.json     tooling/vitest/package.json

# Install ALL dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Copy the rest of the source tree
COPY . .

# Build the web bundle (Vite outputs to apps/web/dist)
RUN pnpm --filter @carnotea/web... build


# ---- Stage 2: Serve with nginx ---------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy the built static bundle
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# nginx config: serve static, reverse-proxy /api + health checks to the api
# container, gzip, security headers — see apps/web/nginx.conf
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
