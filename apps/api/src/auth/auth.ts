import { authAccount, authSession, authUser, authVerification, users, type Db } from '@carnotea/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export interface AuthOptions {
  secret: string;
  baseURL: string;
}

// The domain profile requires first/last name, while better-auth signup carries a
// single `name`. Split on the first space; a single-word name yields an empty last
// name. Profile editing (T-041) refines this later.
function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: '' };
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export function createAuth(db: Db, options: AuthOptions) {
  const isProduction = options.baseURL.startsWith('https://');
  return betterAuth({
    secret: options.secret,
    baseURL: options.baseURL,
    basePath: '/api/auth',
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
      },
    }),
    emailAndPassword: { enabled: true },
    // Hardened session cookies in production (T-049)
    advanced: {
      useSecureCookies: isProduction,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
      },
      // better-auth generates ids in app code; emit UUIDs so the domain `users.id`
      // can reuse the same value (linkage strategy (a) — see packages/db/AGENTS.md).
      database: { generateId: 'uuid' },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user): Promise<void> => {
            const { firstName, lastName } = splitName(user.name);
            await db
              .insert(users)
              .values({
                id: user.id,
                email: user.email.toLowerCase(),
                firstName,
                lastName,
              })
              .onConflictDoNothing();
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
