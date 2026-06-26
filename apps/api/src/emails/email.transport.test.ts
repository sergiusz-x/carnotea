import { describe, expect, it } from 'vitest';

import { createEmailTransport } from './email.transport.js';

describe('createEmailTransport', () => {
  const baseConfig = {
    smtpPort: 587,
    smtpUser: undefined,
    smtpPass: undefined,
    emailFrom: 'CarNotea <noreply@localhost>',
    emailReplyTo: 'noreply@localhost',
  };

  it('creates a transport when smtpHost is provided', () => {
    // Just verifying the factory does not throw — we do not exercise sendMail
    // in unit tests (that needs a real/mock SMTP server).
    expect(() =>
      createEmailTransport({ ...baseConfig, smtpHost: 'smtp.example.com', isDev: false }),
    ).not.toThrow();
  });

  it('creates a Mailpit transport when smtpHost is absent and isDev=true', () => {
    expect(() =>
      createEmailTransport({ ...baseConfig, smtpHost: undefined, isDev: true }),
    ).not.toThrow();
  });

  it('throws in production when smtpHost is absent', () => {
    expect(() =>
      createEmailTransport({ ...baseConfig, smtpHost: undefined, isDev: false }),
    ).toThrow(/SMTP_HOST is required in production/);
  });
});
