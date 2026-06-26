import { authAccount, authSession, authUser, authVerification, users, type Db } from '@carnotea/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';

import { type EmailService } from '../emails/email.service.js';
import { type SupportedLocale } from '../emails/email.templates.js';

export interface AuthOptions {
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
  emailService: EmailService;
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

/** Look up the user's persisted locale from the domain users table; fall back to 'en'. */
async function getUserLocale(db: Db, email: string): Promise<SupportedLocale> {
  const row = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
    columns: { localePref: true },
  });
  const pref = row?.localePref;
  return pref === 'pl' || pref === 'en' ? pref : 'en';
}

export function createAuth(db: Db, options: AuthOptions) {
  const isProduction = options.baseURL.startsWith('https://');
  const emailSvc = options.emailService;

  return betterAuth({
    secret: options.secret,
    baseURL: options.baseURL,
    basePath: '/api/auth',
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: authUser,
        session: authSession,
        account: authAccount,
        verification: authVerification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({
        user,
        url,
      }: {
        user: { email: string; name: string };
        url: string;
      }) => {
        const { firstName } = splitName(user.name);
        const locale = await getUserLocale(db, user.email);
        await emailSvc.sendPasswordResetEmail(user.email, firstName, url, locale);
      },
      sendEmailVerification: async ({
        user,
        url,
      }: {
        user: { email: string; name: string };
        url: string;
      }) => {
        const { firstName } = splitName(user.name);
        const locale = await getUserLocale(db, user.email);
        await emailSvc.sendVerificationEmail(user.email, firstName, url, locale);
      },
    },
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
