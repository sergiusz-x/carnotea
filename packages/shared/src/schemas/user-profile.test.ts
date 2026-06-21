import { describe, expect, it } from 'vitest';

import { UserProfileCreateSchema } from './user-profile.js';

describe('UserProfileCreateSchema', () => {
  it('accepts a valid profile and lower-cases the email', () => {
    const parsed = UserProfileCreateSchema.parse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'Ada@Example.COM',
      localePref: 'en',
      unitsPref: 'metric',
      currencyPref: 'EUR',
    });
    expect(parsed.email).toBe('ada@example.com');
  });

  it('rejects a malformed email', () => {
    expect(() =>
      UserProfileCreateSchema.parse({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'not-an-email',
      }),
    ).toThrow();
  });
});
