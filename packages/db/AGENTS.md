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
