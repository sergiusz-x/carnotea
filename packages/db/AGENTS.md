# packages/db AGENTS.md

Area-specific rules for `@carnotea/db`. These override the root `AGENTS.md`
for any file under `packages/db/`.

## Day-to-day workflow

**Schema change → migration → apply:**

```bash
# 1. Edit schema files under src/schema/
# 2. Generate a new migration (diff against the last snapshot)
pnpm --filter @carnotea/db db:generate

# 3. Review the generated SQL in migrations/<new-file>.sql
# 4. Apply to the local database
pnpm db:migrate        # runs drizzle-kit migrate for all packages
```

For custom SQL that Drizzle can't auto-generate (triggers, raw DDL):

```bash
pnpm --filter @carnotea/db drizzle-kit generate --custom --name=<slug>
# Then fill in the empty migrations/<next>_<slug>.sql that was created
```

## Auth tables + user linkage (T-006)

better-auth (ADR-0004) owns four tables defined in `src/schema/auth.ts`:
`auth_user`, `auth_session`, `auth_account`, `auth_verification`. They live in the
same `public` schema as the domain tables (the codebase keeps everything in
`public`; the `auth_` prefix namespaces them) and use `text` primary keys because
better-auth generates ids in application code.

**Linkage strategy (a): `users.id` IS the better-auth user id.** better-auth is
configured to emit UUIDs (`advanced.database.generateId: 'uuid'`), and a
post-signup hook inserts the domain `users` profile row with that same id. There
is no foreign key between `auth_user` and `users` — the link is the shared id
value. This was chosen over a separate `auth_user_id` FK so that the auth-context
user id can be used directly as the ownership id (`vehicles.user_id`, etc.) with
no extra lookup. The signup hook and id config live in `apps/api/src/auth/`.

## current_mileage on vehicles

The `current_mileage` column on `vehicles` is denormalised for display
convenience. It is **not** updated by a trigger — the service layer
(NestJS, T-004) is responsible for keeping it in sync with the max value
in `mileage_readings` for the vehicle.

## Rules

- **Never edit migration files by hand.** Change the TypeScript schema in
  `src/schema/` and run `pnpm db:generate`. The only exception is the two
  custom migration files (`0002_constraints.sql`, `0003_seed_lookups.sql`)
  which are intentionally handwritten.
- **Never edit `migrations/meta/_journal.json` by hand.** `drizzle-kit`
  manages it. Use `drizzle-kit generate --custom` to register custom SQL.
- Schema uses `casing: 'snake_case'` — TypeScript field names are camelCase;
  the database columns are snake_case. Drizzle maps them automatically.
- For lookup-table PKs use `smallint().generatedAlwaysAsIdentity()`.
- For domain-table PKs use `uuid().default(sql\`gen_random_uuid()\`)`.

## Environment variable

`DATABASE_URL` must be set (or the drizzle.config.ts default is used):

```
DATABASE_URL=postgresql://carnotea:carnotea_dev_password@localhost:5433/carnotea
```
