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

## Prerequisites

| Requirement          | Notes                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| **Dokploy instance** | Self-hosted, Docker Swarm-based; see Dokploy's own install docs                                     |
| **Domain name**      | Managed in Cloudflare; a subdomain is routed to the app via a Cloudflare Tunnel + Dokploy's Traefik |
| **GitHub App**       | Connected in Dokploy (Settings → Git), scoped to only this repo                                     |
| **Docker**           | Managed by Dokploy's own installer                                                                  |

## Release model

- Dokploy's app-level **native GitHub App auto-deploy is off**
  (`Autodeploy` toggle in the app's General tab). GitHub Actions is the
  deploy trigger instead: `.github/workflows/ci.yml`'s `deploy` job calls
  Dokploy's `compose.deploy` API after CI passes on `main` and reports the
  result back to GitHub as a Deployment — see § CI/CD below for why.
- The test gate lives **before** the push even lands on `main`: a GitHub
  **branch protection rule** requires `lint`, `format`, `typecheck`, `test`,
  `build`, and `audit` (`.github/workflows/ci.yml`) to pass before a PR can be
  merged at all. A red PR cannot be merged, so nothing red ever reaches `main`
  for the `deploy` job to deploy — see § CI/CD below.
- Dokploy builds `api`, `web`, and `migrate` from their Dockerfiles, runs the
  `migrate` service (profile `release`) to apply pending DB migrations, then
  rolls out `api`/`web` once migration succeeds.
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

## CI/CD (branch protection → Dokploy)

An earlier iteration of this pipeline had GitHub Actions call Dokploy's REST
API directly (a custom curl-based workflow, a Dokploy API key, and a
Cloudflare Access Service Token to get through the dashboard's Access
protection). It was reverted after repeatedly failing in practice — a wrong
Cloudflare Access path match, then an unconfirmed `applicationId` — each
requiring reverse-engineering Dokploy's internals to debug. Neither failure
affected the running app (the job never touched the deployed containers). See
`tickets/T-046-cd-deploy-migrate.md`'s Notes for the full history.

That gap mattered more than it first looked: Dokploy's native auto-deploy has
**no way to report success/failure back to GitHub** at all — confirmed by
reading Dokploy `v0.29.10`'s own source, not assumed. It also has a known,
currently-unresolved reliability bug where its GitHub webhook is received but
the deploy doesn't trigger
([Dokploy/dokploy#3787](https://github.com/Dokploy/dokploy/issues/3787)),
which a webhook-only pipeline has no way to detect. Branch protection alone
guarantees nothing red _merges_, but says nothing about whether the merge
actually _deployed_.

The current design retries the original API-based approach with both root
causes fixed:

- **Dokploy's `compose.deploy` API** is a direct, synchronous call into
  Dokploy's deploy queue — a different code path from the flaky GitHub
  webhook handler, so it isn't affected by #3787.
- The Cloudflare Access policy is scoped to path `api/compose*` (Access path
  matching is segment-based; the original attempt used `api/application*`
  correctly but for the wrong endpoint family — compose apps use
  `/api/compose.*`, not `/api/application.*`).
- The `composeId` is looked up and confirmed against Dokploy's own data before
  use, not guessed from the dashboard's display slug.
- **GitHub branch protection** stays as the pre-merge gate — Settings →
  Branches → branch protection rule for `main` → require status checks
  (`lint`, `format`, `typecheck`, `test`, `build`, `audit`) to pass before
  merging.
- **GitHub Actions owns the trigger**: `.github/workflows/ci.yml`'s `deploy`
  job runs only on a `push` to `main` after every other CI job succeeds, and
  calls the reusable `.github/workflows/deploy-dokploy.yml` workflow, which
  calls `compose.deploy`, polls `compose.one`'s `composeStatus` until
  `done`/`error`, and records the result as a GitHub Deployment
  (`environment: production`) — the same mechanism Vercel/Netlify use, giving
  a "View deployment" link on the commit/PR and a history in the repo's
  **Environments** tab.
- Dokploy's own `Autodeploy` (GitHub App webhook) toggle is turned **off** for
  this app, so GitHub Actions is the single deploy trigger — leaving both on
  would race a webhook-triggered build against the API-triggered one.

### Wiring up a future app

1. Create the app in Dokploy as usual (Compose type — this workflow targets
   `compose.deploy`/`compose.one`; an `application`-type app would need the
   `application.*` endpoints instead) and confirm its real `composeId`.
2. Leave that app's native `Autodeploy` toggle **off** — GitHub Actions is the
   trigger.
3. Add a `deploy` job to that repo's CI calling
   `sergiusz-x/carnotea/.github/workflows/deploy-dokploy.yml@main` with its
   `compose-id`, gated on the same CI jobs passing.
4. Reuse the existing `DOKPLOY_API_KEY`, `CF_ACCESS_CLIENT_ID`,
   `CF_ACCESS_CLIENT_SECRET` secrets (instance-wide, not per-app) — only a new
   `composeId` is app-specific.

## 1. Configure the production environment

Environment variables are **never** set via a committed or on-disk `.env`
file in production. Set each variable listed (uncommented) in `.env.example`
directly in Dokploy's per-application **Environment Variables** tab — see
§ 8 Secrets management below for the full list and rotation procedure.

## 2. First production start

In Dokploy, create the application (Docker Compose type) pointing at this
repo's `docker-compose.prod.yml`, set the environment variables, then deploy.
Equivalent manual steps, if ever needed outside Dokploy:

```bash
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml --profile release run --rm migrate
docker compose -f docker-compose.prod.yml up -d --wait api web
```

Verify the stack:

```bash
docker compose -f docker-compose.prod.yml ps
curl https://carnotea.sergiusz.dev/healthz
curl https://carnotea.sergiusz.dev/readyz
```

## 3. Day-to-day operations

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

### Run an ad-hoc backup

```bash
docker compose -f docker-compose.prod.yml --profile ops run --rm backup
```

### Stop everything

```bash
docker compose -f docker-compose.prod.yml down
```

### Full reset (destroys all data)

```bash
docker compose -f docker-compose.prod.yml down -v
```

## 4. Automated backups

Backups are driven from the production compose stack through the one-shot
`backup` service. The service uses `pg_dump -Fc` against the `postgres` service,
uploads the dump to S3-compatible object storage, and prunes old objects by
retention count.

### Required backup environment

Set these production-only values in Dokploy's Environment Variables tab for
the app (never in a committed or on-disk file):

```env
BACKUP_S3_BUCKET=car-notea-prod-backups
BACKUP_S3_REGION=eu-central-1
BACKUP_S3_PREFIX=carnotea/postgres
BACKUP_S3_ENDPOINT_URL=https://s3.eu-central-1.amazonaws.com
BACKUP_S3_SSE=AES256
BACKUP_S3_SSE_KMS_KEY_ID=
BACKUP_KEEP_DAILY=7
BACKUP_KEEP_WEEKLY=8
BACKUP_WEEKLY_DAY=7
AWS_ACCESS_KEY_ID=<backup-user-access-key>
AWS_SECRET_ACCESS_KEY=<backup-user-secret-key>
AWS_SESSION_TOKEN=
```

Security notes:

- Keep the bucket private; do not set any public ACLs or public bucket policy.
- `BACKUP_S3_ENDPOINT_URL` must use `https://`; the backup script rejects plain
  `http://`.
- `BACKUP_S3_SSE=AES256` enables server-side encryption by default. If your
  storage uses KMS, set `BACKUP_S3_SSE=aws:kms` and optionally provide
  `BACKUP_S3_SSE_KMS_KEY_ID`.
- Backup credentials should be scoped to the target bucket/prefix only.

### Schedule with host cron

Install a root cron entry on the server, pointing at the directory where
Dokploy checked out this app's compose stack:

```cron
15 2 * * * cd <dokploy-app-directory> && docker compose -f docker-compose.prod.yml --profile ops run --rm backup >> /var/log/carnotea-backup.log 2>&1
```

This runs every day at 02:15 UTC. Adjust the schedule to your maintenance
window.

### Retention policy

- Daily backups: keep the newest `BACKUP_KEEP_DAILY` objects in
  `s3://<bucket>/<prefix>/daily/`
- Weekly backups: on `BACKUP_WEEKLY_DAY`, also upload to
  `s3://<bucket>/<prefix>/weekly/` and keep the newest
  `BACKUP_KEEP_WEEKLY` objects there

Objects are named with an ISO-like UTC timestamp, so lexicographic order matches
backup age. Older objects beyond the keep-count are pruned automatically during
each successful run.

### Failure visibility

- `pg_dump` failure, upload failure, or prune failure returns a non-zero exit
  code from the `backup` service.
- Cron captures stdout/stderr in `/var/log/carnotea-backup.log`.
- A successful run ends with `Backup completed successfully`.

## 5. Restore runbook

The restore flow below assumes you are restoring into a throwaway database on
the VPS first, verifying it, and only then planning a cutover.

### 1. Stop app traffic

```bash
docker compose -f docker-compose.prod.yml stop api web
```

### 2. Pick a backup object

List the most recent backup objects:

```bash
aws --endpoint-url "$BACKUP_S3_ENDPOINT_URL" s3 ls "s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/daily/" --recursive
```

Pick one `s3://...dump` URI from that list.

### 3. Restore into a throwaway database

```bash
docker compose -f docker-compose.prod.yml --profile ops run --rm \
  -e RESTORE_TARGET_DB=carnotea_restore \
  -e RESTORE_SOURCE="s3://$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX/daily/<backup-file>.dump" \
  backup \
  sh -ceu 'apk add --no-cache aws-cli >/dev/null && /scripts/restore.sh'
```

If you prefer to restore from a local file instead of S3, pass the local dump
path to `/scripts/restore.sh` inside the container.

### 4. Verify the restored data

Check a couple of high-signal invariants:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U "$POSTGRES_USER" -d carnotea_restore -c 'select count(*) from users;'

docker compose -f docker-compose.prod.yml exec postgres \
  psql -U "$POSTGRES_USER" -d carnotea_restore -c 'select count(*) from vehicles;'
```

Also inspect one known user/vehicle row if you have a safe fixture to compare
against.

### 5. Cut over or discard

If the restore is only a drill, drop the throwaway database:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  dropdb -U "$POSTGRES_USER" carnotea_restore
```

If you are performing a real disaster recovery, repeat the same restore flow
into the production database only after you are satisfied with the throwaway
verification.

## 6. Rollback

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

## 7. Out of scope

| Feature            | Ticket |
| ------------------ | ------ |
| Security hardening | T-049  |

## 8. Secrets management

Production secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, SMTP credentials,
backup storage keys, etc.) are **never** stored in a committed file or an
on-disk `.env` on the host. The canonical mechanism is:

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

### Required production variables

See `.env.example` for the full, commented list (marked `[PROD]`). At minimum:
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGINS`. The
public domain itself is assigned to the `web` service through Dokploy's
Domains tab, not an env var.

### GitHub Actions deploy-trigger secrets

Separate from the app's own production env vars above — these let
`.github/workflows/deploy-dokploy.yml` call Dokploy's API and are stored as
**GitHub repository secrets** (Settings → Secrets and variables → Actions),
not in Dokploy:

| Secret                    | Purpose                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| `DOKPLOY_API_KEY`         | Account-wide Dokploy API key (`x-api-key` header) — Dokploy → Settings → Profile. |
| `CF_ACCESS_CLIENT_ID`     | Cloudflare Access Service Token client ID, scoped to path `api/compose*`.         |
| `CF_ACCESS_CLIENT_SECRET` | Cloudflare Access Service Token client secret.                                    |

`DOKPLOY_COMPOSE_ID` is a plain repository **variable** (not a secret — it's
an opaque ID, not a credential), currently `FV0R9T3polDcelIZHPv-h` for
CarNotea.

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

| Secret class                         | How to rotate                                                                                                                                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                 | Generate a new value (`openssl rand -base64 32`), set it in Dokploy's Environment Variables for the `api` service, redeploy. All existing sessions are invalidated — expected.                                  |
| `DATABASE_URL` / Postgres password   | Rotate the Postgres role password first (`ALTER ROLE ... PASSWORD ...` inside the `postgres` container), then update `DATABASE_URL` in Dokploy and redeploy `api`/`migrate` before the old password is revoked. |
| SMTP credentials                     | Update `SMTP_USER`/`SMTP_PASS` in Dokploy's Environment Variables for `api`, redeploy. No downtime — only outgoing mail is affected.                                                                            |
| Backup storage keys (`AWS_*`, T-047) | Issue a new access key scoped to the backup bucket/prefix, set it in Dokploy, redeploy the `backup` job, then revoke the old key once a scheduled run succeeds with the new one.                                |
| `DOKPLOY_API_KEY`                    | Generate a new token in Dokploy (Settings → Profile → API/CLI), update the GitHub repository secret, revoke the old token in Dokploy.                                                                           |
| `CF_ACCESS_CLIENT_ID`/`_SECRET`      | Rotate the Service Token in Cloudflare Zero Trust (Access → Service Auth), update both GitHub repository secrets, remove the old token from the Access policy.                                                  |

A redeploy in Dokploy re-runs `docker compose up -d` for the stack, which
picks up the new environment values for the affected service(s) without
requiring a fresh image build.

### Web (`VITE_*`) build-time values

`VITE_*` variables are compiled into the static `web` bundle at build time and
shipped to every browser — they are **not** secrets. The only one in use today,
`VITE_OTEL_EXPORTER_OTLP_ENDPOINT`, is a public trace-collector URL, not a
credential. Never put a genuine secret behind a `VITE_`-prefixed name; keep it
server-side (`apps/api`) only.
