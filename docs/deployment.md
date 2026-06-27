# Deployment

This document describes the production deployment flow for CarNotea: GitHub
Actions builds the `api` and `web` images, publishes them to GHCR, then deploys
them to the VPS over SSH with a blocking migration step.

## Prerequisites

| Requirement                | Notes                                               |
| -------------------------- | --------------------------------------------------- |
| **VPS**                    | Linux x86_64 host with Docker Engine + Compose v2   |
| **Domain name**            | A/AAAA record pointed at the VPS IP                 |
| **Ports 80 + 443**         | Open in the firewall; Caddy handles TLS             |
| **Docker**                 | `docker --version` ≥ 24                             |
| **Docker Compose**         | `docker compose version` ≥ 2.x                      |
| **Git**                    | Required on the VPS so deploy can `git pull`        |
| **GHCR access token**      | Read access for the VPS host to pull release images |
| **GitHub Actions secrets** | SSH + registry credentials for the deploy workflow  |

## Release model

- `push` to `main` triggers `.github/workflows/deploy.yml`.
- CI builds and pushes:
  - `ghcr.io/<owner>/carnotea-api:sha-<commit>`
  - `ghcr.io/<owner>/carnotea-web:sha-<commit>`
  - moving `:latest` tags for both images
- The deploy job SSHes to the VPS, fast-forwards the checkout to `origin/main`,
  pulls the just-built images, runs the migration container, then rolls the app
  to the new image tag.

The migration step is ordered before the app rollout. If it fails, the workflow
fails and the currently running `api` / `web` containers stay in place.

## 1. Bootstrap the VPS checkout

```bash
git clone <repo-url> /opt/carnotea
cd /opt/carnotea
git switch main
```

The deploy workflow expects the repository checkout on the server because it
updates the checked-out `docker-compose.prod.yml` and docs with `git pull`.

## 2. Configure the production environment

Create the `.env` file in the deploy checkout:

```bash
cp .env.example .env
```

Edit `.env` with your production values:

```env
# ---- Release images ---------------------------------------------------------
IMAGE_REGISTRY=ghcr.io/<github-owner>
IMAGE_TAG=latest

# ---- Domain (Caddy TLS) -----------------------------------------------------
DOMAIN=carnotea.example.com

# ---- PostgreSQL -------------------------------------------------------------
POSTGRES_DB=carnotea
POSTGRES_USER=carnotea
POSTGRES_PASSWORD=<generate-with-openssl-rand-base64-24>
DATABASE_URL=postgresql://carnotea:***@postgres:5432/carnotea

# ---- Auth -------------------------------------------------------------------
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=https://carnotea.example.com

# ---- Security ----------------------------------------------------------------
CORS_ORIGINS=https://carnotea.example.com
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_WINDOW_MS=60000
BODY_LIMIT=1048576
```

`IMAGE_TAG=latest` is the normal steady-state setting. The automated deploy job
overrides it for each release with the immutable `sha-<commit>` tag it just
published.

## 3. Configure GitHub Actions secrets

Set these repository secrets before enabling the deploy workflow:

| Secret name              | Purpose                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `DEPLOY_HOST`            | VPS hostname or IP                                         |
| `DEPLOY_USER`            | SSH user for deploy                                        |
| `DEPLOY_PATH`            | Absolute path to the deploy checkout, e.g. `/opt/carnotea` |
| `DEPLOY_SSH_KEY`         | Private key used by Actions to SSH into the VPS            |
| `DEPLOY_SSH_KNOWN_HOSTS` | `known_hosts` entry for the VPS host key                   |
| `GHCR_USERNAME`          | GHCR username used by the VPS host during `docker login`   |
| `GHCR_TOKEN`             | GHCR token / PAT with package read access                  |

The workflow uses GitHub's built-in `GITHUB_TOKEN` to push images to GHCR from
CI, but the VPS still needs its own registry credentials to pull those images.

## 4. First production start

Run the same ordered release steps the workflow uses:

```bash
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml --profile release run --rm migrate
docker compose -f docker-compose.prod.yml up -d --wait api web caddy
```

Verify the stack:

```bash
docker compose -f docker-compose.prod.yml ps
curl https://<DOMAIN>/healthz
curl https://<DOMAIN>/readyz
```

## 5. What the automated deploy does

For every push to `main`, the deploy workflow runs these remote steps:

```bash
cd /opt/carnotea
git fetch origin main
git switch main
git pull --ff-only origin main

docker login ghcr.io
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml pull api web
docker compose -f docker-compose.prod.yml --profile release run --rm migrate
docker compose -f docker-compose.prod.yml up -d --wait api web caddy
```

Why this ordering matters:

- `pull` gets the exact immutable image tag built for the release.
- `migrate` runs as a one-shot container before the app rollout.
- `up -d --wait` replaces the running app only after the migration succeeds.

If `migrate` exits non-zero, the workflow stops there and the currently running
containers keep serving traffic.

## 6. Day-to-day operations

### Logs

```bash
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f migrate
```

### Restart a service

```bash
docker compose -f docker-compose.prod.yml restart api
```

### Stop everything

```bash
docker compose -f docker-compose.prod.yml down
```

### Full reset (destroys all data)

```bash
docker compose -f docker-compose.prod.yml down -v
```

## 7. Rollback

Rollback is an **application-image rollback**, not a database rollback. The
schema changes must therefore follow the expand-then-contract pattern:

1. add backwards-compatible schema,
2. deploy code that can work with both old and new schema,
3. backfill / switch reads,
4. only later remove the legacy shape.

To roll back the app to a previously published image:

```bash
export IMAGE_TAG=sha-<older-commit>
docker compose -f docker-compose.prod.yml pull api web
docker compose -f docker-compose.prod.yml up -d --wait api web caddy
```

Do **not** run a down-migration as part of routine rollback. If the previous app
cannot run against the migrated schema, the migration was not release-safe and
must be fixed in a forward patch.

## 8. Out of scope

| Feature                     | Ticket |
| --------------------------- | ------ |
| Automated backups / restore | T-047  |
| Production secret storage   | T-048  |
| Security hardening          | T-049  |
