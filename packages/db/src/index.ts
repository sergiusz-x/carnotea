import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsTransaction } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { PostgresJsTransaction } from 'drizzle-orm/postgres-js';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import * as schema from './schema/index.js';

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl);
  return drizzle(client, { schema, casing: 'snake_case' });
}

export type Db = ReturnType<typeof createDb>;
/** A Drizzle transaction handle — same query surface as Db, but without $client. */
export type Tx = PostgresJsTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;

export * from './schema/index.js';
