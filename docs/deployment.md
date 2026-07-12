# Deployment

CarNotea is deployed through a self-hosted [Dokploy](https://dokploy.com)
instance running on a home server. Dokploy runs `docker-compose.prod.yml` as a
"Docker Compose" application: it clones the repo itself via a connected
GitHub App, **builds `api`/`web`/`migrate` directly from their Dockerfiles**
(no image registry involved), and manages TLS/domain routing through its own
built-in Traefik instance. There is no separate CI image-publish step and no
SSH-based deploy workflow — see `docs/agents/lessons.md` (2026-07-04 entries)
and T-085 for why the earlier GHCR + SSH model was dropped.

The server itself sits on a private LAN and is reached from the internet only
through a Cloudflare Tunnel (`cloudflared`), never via a directly exposed
public IP or port-forwarding.

## Architecture overview

```
Dokploy
├── CarNotea Compose (docker-compose.prod.yml)
│   ├── migrate    — one-shot Drizzle migration runner (profile: release)
│   ├── api        — NestJS / Fastify backend
│   └── web        — Nginx static server (SPA + reverse proxy to api)
└── PostgreSQL Database Service (Create Service → Database → PostgreSQL 16)
    └── Backups managed by Dokploy → Cloudflare R2
```

PostgreSQL is **not** part of `docker-compose.prod.yml`. It runs as a separate
Dokploy Database service, independent of the app stack lifecycle. The app
connects to it exclusively through `DATABASE_URL`. See [ADR-0015](./adr/0015-dokploy-managed-postgres.md)
for the full rationale.

> [!CAUTION]
> **DO NOT merge this codebase before completing the Dokploy database cutover.**
> Merging while the old in-compose Postgres volume is still the live database,
> without first creating the new Dokploy Database service and migrating data,
> **will cause downtime**. Follow the cutover runbook in § Cutover runbook below
> before merging and deploying.

## Prerequisites

| Requirement          | Notes                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| **Dokploy instance** | Self-hosted, Docker Swarm-based; see Dokploy's own install docs                                     |
| **Domain name**      | Managed in Cloudflare; a subdomain is routed to the app via a Cloudflare Tunnel + Dokploy's Traefik |
| **GitHub App**       | Connected in Dokploy (Settings → Git), scoped to only this repo                                     |
| **Docker**           | Managed by Dokploy's own installer                                                                  |

## Release model

- Dokploy's app-level **native GitHub App auto-deploy** is **on**
  (`Autodeploy` toggle in the app's General tab): every push to `main`
  triggers a deploy through Dokploy's own GitHub App webhook — the same
  mechanism that already got this app live, with no custom API calls, no
  extra credentials, and nothing for this repo to guess (application IDs,
  endpoint shapes) about Dokploy's internals.
- The test gate lives **before** the push even lands on `main`: a GitHub
  **branch protection rule** requires `lint`, `format`, `typecheck`, `test`,
  `build`, and `audit` (`.github/workflows/ci.yml`) to pass before a PR can be
  merged at all. A red PR cannot be merged, so nothing red ever reaches `main`
  for Dokploy to deploy — see § CI/CD (branch protection) below.
- Dokploy builds `api`, `web`, and `migrate` from their Dockerfiles, runs the
  `migrate` service (profile `release`) to apply pending DB migrations, then
  rolls out `api`/`web` once migration succeeds.
- The deployed web build exposes its metadata in the UI and at
  `/version.json`. Refreshing the browser after a rollout should show a new
  `displayVersion` (`<release-version>+build.<short-sha>`) once Dokploy has
  started serving the new static bundle. If the value is still old, the deploy
  has not reached the browser yet.
- The public domain (e.g. `carnotea.sergiusz.dev`) is assigned to the `web`
  service through Dokploy's **Domains** tab, which configures Traefik routing
  and TLS automatically — no `DOMAIN` env var or reverse-proxy service needed
  in the compose file itself.
- Only `web` gets a public domain; `api` is never directly exposed. The SPA
  calls same-origin relative paths (`fetch('/api/vehicles')`), so `web`'s
  nginx (`apps/web/nginx.conf`) reverse-proxies `/api/*`, `/healthz`, and
  `/readyz` to the `api` container (`carnotea-prod-api:3001`) over the
  `carnotea-prod` Docker network — everything else falls through to the SPA's
  `index.html`. This means an unmatched `/api/*` path or a missing/misrouted
  proxy rule fails as a **405/404 from nginx serving the SPA fallback**, not
  as a connection error — check the actual response body, not just the
  status code, when verifying the API is reachable (`curl .../healthz` alone
  can return `200` from the SPA shell even when the API is unreachable).

If `migrate` exits non-zero, Dokploy stops the deployment and the currently
running `api`/`web` containers keep serving traffic.

The web nginx config serves both `index.html` and `version.json` with
`Cache-Control: no-store`, so a normal refresh pulls the newest shell/build
metadata rather than a stale cached copy.

## CI/CD (branch protection → Dokploy)

An earlier iteration of this pipeline had GitHub Actions call Dokploy's REST
API directly (a custom curl-based workflow, a Dokploy API key, and a
Cloudflare Access Service Token to get through the dashboard's Access
protection). It was reverted after repeatedly failing in practice — a wrong
Cloudflare Access path match, then an unconfirmed `applicationId` — each
requiring reverse-engineering Dokploy's internals to debug. None of those
failures affected the running app (the job never touched the deployed
containers), but they made deploys unreliable and added three credentials
that don't exist anymore. See `tickets/T-046-cd-deploy-migrate.md`'s Notes for
the full history.

The current design gets the same outcome (nothing red reaches production)
using only features that are already proven to work:

- **Dokploy's native auto-deploy** — zero configuration, zero credentials in
  this repo, the exact mechanism Dokploy is built around.
- **GitHub branch protection** — a mature, first-party GitHub feature, not a
  hand-rolled script. Settings → Branches → branch protection rule for `main`
  → require status checks (`lint`, `format`, `typecheck`, `test`, `build`,
  `audit`) to pass before merging.

### Wiring up a future app

1. Create the app in Dokploy as usual (Compose or Application type, pick the
   repo/branch) — unavoidable in any platform, Vercel included.
2. Leave that app's native `Autodeploy` toggle **on**.
3. Add the same branch protection rule (required status checks matching that
   repo's CI job names) on that repo's `main`.

No Dokploy API key, Cloudflare Service Token, or Access policy is needed —
nothing beyond what Dokploy and GitHub already provide out of the box.

## 1. PostgreSQL Database service

PostgreSQL 16 runs as a **separate Dokploy Database service**, not as a service
inside `docker-compose.prod.yml`.

### Create the service

1. In Dokploy: **Create Service → Database → PostgreSQL** → choose version 16.
2. Give it a recognisable name (e.g. `carnotea-db`).
3. Set the database name, username, and password in Dokploy's database
   configuration panel (these stay inside Dokploy — never in this repo).
4. Once created, copy the **Internal Connection URL** from the database's
   Overview tab. It looks like:
   ```
   postgresql://<user>:<password>@<internal-host>:<port>/<dbname>
   ```
5. Set this URL as `DATABASE_URL` in the CarNotea compose application's
   **Environment Variables** tab in Dokploy.

The database does **not** need a public endpoint. `migrate` and `api` reach it
over Dokploy's internal Docker network using the Internal Connection URL.

### Why not in compose?

See [ADR-0015](./adr/0015-dokploy-managed-postgres.md). In short:

- independent lifecycle (app restarts don't touch the DB);
- backups managed from Dokploy UI, R2 credentials stay in Dokploy;
- simpler compose file, smaller secret surface.

## 2. Backups

Backups are configured entirely from **Dokploy's UI** for the PostgreSQL
Database service. CarNotea's repository contains no backup scripts, no
retention logic, and no R2 credentials.

### Configure in Dokploy

1. Open the Postgres Database service in Dokploy.
2. Go to its **Backups** tab.
3. Configure the Cloudflare R2 destination (bucket name, R2 endpoint, access
   key ID, secret access key). These credentials are stored in Dokploy and
   never leave it.
4. Set a schedule (e.g. daily at 02:15 UTC) and retention policy.
5. Trigger a **manual backup** immediately and verify that the backup object
   appears in the R2 bucket.
6. Test a **restore** from that backup into a throwaway database before going
   live (see § Cutover runbook step 5).

### Restore

Use Dokploy's UI restore flow for the PostgreSQL Database service. No shell
scripts or `docker compose` commands are needed.

## 3. Configure the production environment

Environment variables are **never** set via a committed or on-disk `.env`
file in production. Set each variable listed (uncommented) in `.env.example`
directly in Dokploy's per-application **Environment Variables** tab — see
§ 8 Secrets management below for the full list and rotation procedure.

## 4. First production start

In Dokploy, create the application (Docker Compose type) pointing at this
repo's `docker-compose.prod.yml`, set the environment variables (including
`DATABASE_URL` from the Dokploy Database service), then deploy. Equivalent
manual steps, if ever needed outside Dokploy:

```bash
COMPOSE_PROFILES=release \
DATABASE_URL='postgresql://...' \
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d --wait api web
```

Verify the stack:

```bash
docker compose -f docker-compose.prod.yml ps
curl https://carnotea.sergiusz.dev/healthz
curl https://carnotea.sergiusz.dev/readyz
```

## 5. Day-to-day operations

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

> [!NOTE]
> `docker compose down` stops only `migrate`, `api`, and `web`. The Dokploy
> PostgreSQL Database service continues running independently and is unaffected.

## 6. Cutover runbook

> [!CAUTION]
> Complete every step below **before** merging and deploying this PR. Merging
> while the old in-compose Postgres is still live **will cause downtime**.

The steps assume there is an existing production Postgres volume
(`carnotea-prod-postgres-data`) from the previous compose stack, and you are
migrating its data to a new Dokploy Database service.

### Step 1 — Create the new Dokploy PostgreSQL 16 service

In Dokploy: **Create Service → Database → PostgreSQL** (version 16). Configure
database name, username, and password. Note the Internal Connection URL.

### Step 2 — Copy data from the old database to the new one

With the old compose stack still running (do not stop it yet):

```bash
# 1. Dump from the old in-compose postgres
docker exec carnotea-prod-postgres \
  pg_dump -U carnotea -Fc carnotea > /tmp/carnotea-premigration.dump

# 2. Restore into the new Dokploy database
# Replace <new-host>, <new-port>, <new-user>, <new-dbname> with the values
# from Dokploy's Internal Connection URL.
pg_restore \
  -h <new-host> \
  -p <new-port> \
  -U <new-user> \
  -d <new-dbname> \
  --no-owner \
  /tmp/carnotea-premigration.dump
```

If you cannot reach the new Dokploy DB directly from the host, run `pg_restore`
inside a temporary postgres container on the Dokploy Docker network.

### Step 3 — Verify the data

Connect to the new database and confirm critical record counts match the old one:

```bash
psql '<new-DATABASE_URL>' \
  -c 'SELECT count(*) FROM users;' \
  -c 'SELECT count(*) FROM vehicles;' \
  -c 'SELECT count(*) FROM fuel_logs;'
```

Compare against the same counts from the old database. Inspect a known
user/vehicle row if you have a safe fixture.

### Step 4 — Configure Dokploy backups for the new database

1. Open the new Dokploy Postgres service → **Backups** tab.
2. Configure Cloudflare R2 destination and schedule.
3. Trigger a manual backup immediately.

### Step 5 — Verify backup and restore

Test that the backup can be restored into a throwaway database before going
live. Use Dokploy's own restore UI, or:

```bash
# Download the backup object from R2 and restore into a throwaway DB
# (use the Dokploy UI for this — no scripts needed)
```

### Step 6 — Set the new DATABASE_URL in Dokploy

In the CarNotea compose application's **Environment Variables** tab, update
`DATABASE_URL` to the Internal Connection URL of the new Dokploy Database
service.

### Step 7 — Merge and deploy this PR

Only now is it safe to merge. Dokploy will:

1. Pull the updated `docker-compose.prod.yml` (no `postgres`/`backup` services).
2. Run `migrate` against the new Dokploy database.
3. Start `api` and `web`.

### Step 8 — Verify the deployment

```bash
curl https://carnotea.sergiusz.dev/healthz   # check body, not just status
curl https://carnotea.sergiusz.dev/readyz
```

Log in and verify that user data and vehicles are present and correct.

### Step 9 — Retain the old volume temporarily

Do **not** immediately remove the old `carnotea-prod-postgres-data` Docker
volume. Keep it for at least one week as an additional rollback safety net.
Once you are confident the new database is stable and backups are working,
remove it:

```bash
docker volume rm carnotea-prod-postgres-data
```

## 7. Rollback

Rollback is a **code rollback**, not a database rollback. The schema changes
must therefore follow the expand-then-contract pattern:

1. add backwards-compatible schema,
2. deploy code that can work with both old and new schema,
3. backfill / switch reads,
4. only later remove the legacy shape.

Since Dokploy builds `api`/`web` from source rather than pulling tagged
registry images, rolling back means redeploying a previous commit: in
Dokploy's **Deployments** tab for the app, pick an earlier successful
deployment and redeploy it. This rebuilds the images from that commit and
rolls the stack back to it.

Do **not** run a down-migration as part of routine rollback. If the previous
app cannot run against the migrated schema, the migration was not
release-safe and must be fixed in a forward patch.

## 8. Out of scope

| Feature            | Ticket |
| ------------------ | ------ |
| Security hardening | T-049  |

## 9. Secrets management

Production secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, SMTP credentials,
etc.) are **never** stored in a committed file or an on-disk `.env` on the
host. The canonical mechanism is:

- Each Dokploy application (the `docker-compose.prod.yml` stack) has its own
  **Environment Variables** tab in the Dokploy dashboard. Values entered there
  are stored in Dokploy's own database and injected at deploy time when
  Dokploy runs `docker compose` for that application — the same
  `${VAR:?error}` placeholders already in `docker-compose.prod.yml` pick them
  up with no other wiring needed.
- `.env.example` remains the single committed source of truth for **which**
  variable names are required; it never holds a real secret value, only
  placeholders.
- `.gitignore` ignores every `.env*` file except `.env.example`, so a real
  `.env` can never be committed by accident.
- R2 backup credentials for the Dokploy Database service stay inside Dokploy's
  own configuration — they are never entered into the compose application's
  Environment Variables and are not listed in `.env.example`.

### Required production variables

See `.env.example` for the full, commented list (marked `[PROD]`). At minimum:
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGINS`. The
public domain itself is assigned to the `web` service through Dokploy's
Domains tab, not an env var.

### Fail-fast enforcement

`apps/api/src/config/env.ts` validates `process.env` with Zod at boot:

- Required variables (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
  have no default — a missing value is a boot-time crash, not a silent
  fallback, in every environment.
- When `NODE_ENV=production`, a `superRefine` additionally rejects the known
  `.env.example` placeholder values (e.g. the example `BETTER_AUTH_SECRET` or
  `carnotea_dev_password`) even if pasted verbatim, so a copy-paste-without-
  editing mistake fails at boot instead of shipping an insecure default.

### Rotation procedure

| Secret class                       | How to rotate                                                                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`               | Generate a new value (`openssl rand -base64 32`), set it in Dokploy's Environment Variables for the `api` service, redeploy. All existing sessions are invalidated — expected.         |
| `DATABASE_URL` / Postgres password | Rotate the Postgres role password in Dokploy's Database service panel, then update `DATABASE_URL` in Dokploy's Environment Variables for the compose app and redeploy `api`/`migrate`. |
| SMTP credentials                   | Update `SMTP_USER`/`SMTP_PASS` in Dokploy's Environment Variables for `api`, redeploy. No downtime — only outgoing mail is affected.                                                   |

A redeploy in Dokploy re-runs `docker compose up -d` for the stack, which
picks up the new environment values for the affected service(s) without
requiring a fresh image build.

### Web (`VITE_*`) build-time values

`VITE_*` variables are compiled into the static `web` bundle at build time and
shipped to every browser — they are **not** secrets. The only one in use today,
`VITE_OTEL_EXPORTER_OTLP_ENDPOINT`, is a public trace-collector URL, not a
credential. Never put a genuine secret behind a `VITE_`-prefixed name; keep it
server-side (`apps/api`) only.
