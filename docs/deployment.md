# Deployment

This document describes how to deploy CarNotea on a fresh VPS using the
production Docker Compose stack with automatic TLS via Caddy.

## Prerequisites

| Requirement        | Notes                                          |
| ------------------ | ---------------------------------------------- |
| **VPS**            | Any Linux x86_64 host with Docker & Compose v2 |
| **Domain name**    | An A/AAAA record pointing at the VPS IP        |
| **Ports 80 + 443** | Open in the firewall; Caddy handles TLS        |
| **Docker**         | `docker --version` ≥ 24                        |
| **Docker Compose** | `docker compose version` ≥ 2.x                 |
| **Git**            | To clone the repo                              |

## 1. Clone the repository

```bash
git clone <repo-url> /opt/carnotea
cd /opt/carnotea
```

## 2. Configure environment

Create a `.env` file in the project root. Every value is required unless a
default is documented.

```bash
cp .env.example .env
```

Edit `.env` with your production values:

```env
# ── Domain (Caddy uses this for TLS certificate) ──────────────────────────
DOMAIN=carnotea.example.com

# ── PostgreSQL ────────────────────────────────────────────────────────────
POSTGRES_DB=carnotea
POSTGRES_USER=carnotea
POSTGRES_PASSWORD=<generate-with-openssl-rand-base64-24>

# ── API database connection ───────────────────────────────────────────────
DATABASE_URL=postgresql://carnotea:<password>@postgres:5432/carnotea

# ── Auth (better-auth) ────────────────────────────────────────────────────
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=https://carnotea.example.com

# ── Security hardening ────────────────────────────────────────────────────
CORS_ORIGINS=https://carnotea.example.com
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_WINDOW_MS=60000
BODY_LIMIT=1048576
```

> **Important:** Never commit `.env` — it is in `.gitignore`. The committed
> `.env.example` is the template reference.

## 3. Build and start

```bash
docker compose -f docker-compose.prod.yml up -d
```

This builds the API and web images (first run takes a few minutes), pulls
Postgres and Caddy images, creates volumes, and starts everything.

Check status:

```bash
docker compose -f docker-compose.prod.yml ps
```

## 4. Apply database migrations

Migrations must run before the API can serve requests. Run them once:

```bash
docker compose -f docker-compose.prod.yml exec api \
    pnpm --filter @carnotea/db db:migrate
```

After this, the API health checks will pass:

```bash
curl https://carnotea.example.com/healthz
curl https://carnotea.example.com/readyz
```

## 5. Verify the deployment

| Check                   | Command / URL                                    |
| ----------------------- | ------------------------------------------------ |
| Web app loads           | `https://<DOMAIN>/`                              |
| API health              | `curl https://<DOMAIN>/healthz`                  |
| API readiness (with DB) | `curl https://<DOMAIN>/readyz`                   |
| Docker logs             | `docker compose -f docker-compose.prod.yml logs` |

## 6. Day-to-day operations

### View logs

```bash
docker compose -f docker-compose.prod.yml logs -f       # all services
docker compose -f docker-compose.prod.yml logs -f api   # API only
```

### Restart a service

```bash
docker compose -f docker-compose.prod.yml restart api
```

### Rebuild images after a code update

```bash
git pull origin main
docker compose -f docker-compose.prod.yml build --pull
docker compose -f docker-compose.prod.yml up -d
```

### Stop everything (preserves data volumes)

```bash
docker compose -f docker-compose.prod.yml down
```

### Full reset (destroys all data)

```bash
docker compose -f docker-compose.prod.yml down -v
```

## Service architecture

```
                        ┌─────────────┐
                        │   Caddy     │  port 80 / 443 (TLS)
                        │  (reverse   │
                        │   proxy)    │
                        └──────┬──────┘
                           │       │
                           ▼       ▼
                     ┌────────┐ ┌────────┐
                     │  web   │ │  api   │
                     │(nginx) │ │(NestJS)│
                     └────────┘ └───┬────┘
                                     │
                                     ▼
                               ┌──────────┐
                               │ postgres │
                               │   :5432  │
                               └──────────┘
```

Only Caddy exposes host ports (80/443). All other services are on an internal
Docker network and communicate by service name.

## Notable configuration

- **Caddy** (`Caddyfile`): automatic Let's Encrypt TLS. The domain is read from
  the `DOMAIN` env var. API paths (`/api/*`, `/healthz`, `/readyz`) are proxied
  to the API container; everything else goes to the web static server.
- **Postgres** volume is persistent: `postgres_prod_data`.
- **API** depends on a healthy Postgres before starting.
- **All long-running services** use `restart: unless-stopped`.

## Out of scope (covered by future tickets)

| Feature              | Ticket |
| -------------------- | ------ |
| CI/CD image publish  | T-046  |
| Automated migrations | T-046  |
| Backup / restore     | T-047  |
| Secrets store        | T-048  |
| Security hardening   | T-049  |
