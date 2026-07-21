import crypto from 'node:crypto';

import { createDb, users } from '@carnotea/db';
import { test as base } from '@playwright/test';
import { eq } from 'drizzle-orm';

type TestFixtures = {
  db: ReturnType<typeof createDb>;
  testUser: { name: string; email: string; password: string };
};

export const test = base.extend<TestFixtures>({
  db: async ({ page: _page }, use) => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for E2E tests');
    }
    const db = createDb(process.env.DATABASE_URL);
    await use(db);
  },
  testUser: async ({ db }, use) => {
    const id = crypto.randomUUID().slice(0, 8);
    const user = {
      name: `Test User ${id}`,
      email: `test-${id}@example.com`,
      password: 'password123',
    };

    await use(user);

    // Cleanup after test
    await db.delete(users).where(eq(users.email, user.email));
  },
});

export { expect } from '@playwright/test';
