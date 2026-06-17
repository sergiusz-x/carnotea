import { authUser, createDb, users, type Db } from '@carnotea/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAuth, type Auth } from './auth.js';

// Exercises the real signup → databaseHooks → domain profile flow against a live
// Postgres. Skipped when DATABASE_URL is absent (e.g. CI without a database or a
// sandbox without Docker); run it locally with the docker-compose Postgres up.
const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)('better-auth signup creates a linked domain profile (DB)', () => {
  let db: Db;
  let auth: Auth;
  let userId: string | undefined;
  const email = `t006-${Date.now().toString()}@example.com`;

  beforeAll(() => {
    db = createDb(databaseUrl as string);
    auth = createAuth(db, {
      secret: 'test-secret-at-least-16-chars',
      baseURL: 'http://localhost:3001',
    });
  });

  afterAll(async () => {
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
      await db.delete(authUser).where(eq(authUser.id, userId));
    }
  });

  it('mirrors the auth user into vehicle_diary.users with a split name', async () => {
    const result = await auth.api.signUpEmail({
      body: { name: 'Jan Kowalski', email, password: 'sup3rs3cret!' },
    });
    userId = result.user.id;

    const profile = await db.query.users.findFirst({ where: eq(users.id, userId) });

    expect(profile).toBeDefined();
    expect(profile?.id).toBe(userId);
    expect(profile?.email).toBe(email.toLowerCase());
    expect(profile?.firstName).toBe('Jan');
    expect(profile?.lastName).toBe('Kowalski');
  });
});
