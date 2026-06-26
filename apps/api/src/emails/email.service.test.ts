import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createEmailService, type EmailService } from './email.service.js';
import { type EmailMessage, type EmailTransport } from './email.transport.js';

interface MockTransport extends EmailTransport {
  calls: EmailMessage[];
}

function makeMockTransport(): MockTransport {
  const calls: EmailMessage[] = [];
  return {
    calls,
    send(msg: EmailMessage) {
      calls.push(msg);
      return Promise.resolve();
    },
  };
}

/** Asserts a call was made and returns the first message (fails the test if absent). */
function firstCall(calls: EmailMessage[]): EmailMessage {
  const call = calls[0];
  expect(call).toBeDefined();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return call!;
}

describe('EmailService', () => {
  let transport: ReturnType<typeof makeMockTransport>;
  let service: EmailService;

  beforeEach(() => {
    transport = makeMockTransport();
    service = createEmailService({ transport });
  });

  describe('sendVerificationEmail', () => {
    it('sends via transport with correct recipient', async () => {
      await service.sendVerificationEmail(
        'user@example.com',
        'Anna',
        'https://example.com/verify',
        'en',
      );
      expect(transport.calls).toHaveLength(1);
      expect(firstCall(transport.calls).to).toBe('user@example.com');
    });

    it('includes EN subject for en locale', async () => {
      await service.sendVerificationEmail(
        'user@example.com',
        'Anna',
        'https://example.com/verify',
        'en',
      );
      expect(firstCall(transport.calls).subject).toBe('Verify your CarNotea email address');
    });

    it('includes PL subject for pl locale', async () => {
      await service.sendVerificationEmail(
        'user@example.com',
        'Anna',
        'https://example.com/verify',
        'pl',
      );
      expect(firstCall(transport.calls).subject).toBe('Potwierdź adres e-mail w CarNotea');
    });

    it('includes the action URL in the email body text', async () => {
      const url = 'https://example.com/verify?token=abc';
      await service.sendVerificationEmail('user@example.com', 'Anna', url, 'en');
      expect(firstCall(transport.calls).text).toContain(url);
    });

    it('does not throw when transport fails (enumeration-safe)', async () => {
      const failingTransport: EmailTransport = {
        send: vi.fn().mockRejectedValue(new Error('SMTP error')),
      };
      const svc = createEmailService({ transport: failingTransport });
      await expect(
        svc.sendVerificationEmail('user@example.com', 'Anna', 'https://example.com/verify', 'en'),
      ).resolves.toBeUndefined();
    });

    it('falls back to en locale when locale is not passed', async () => {
      await service.sendVerificationEmail('user@example.com', 'Anna', 'https://example.com/verify');
      expect(firstCall(transport.calls).subject).toBe('Verify your CarNotea email address');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('sends via transport with correct recipient', async () => {
      await service.sendPasswordResetEmail(
        'user@example.com',
        'Jan',
        'https://example.com/reset',
        'pl',
      );
      expect(transport.calls).toHaveLength(1);
      expect(firstCall(transport.calls).to).toBe('user@example.com');
    });

    it('includes PL subject for pl locale', async () => {
      await service.sendPasswordResetEmail(
        'user@example.com',
        'Jan',
        'https://example.com/reset',
        'pl',
      );
      expect(firstCall(transport.calls).subject).toBe('Zresetuj hasło w CarNotea');
    });

    it('includes EN subject for en locale', async () => {
      await service.sendPasswordResetEmail(
        'user@example.com',
        'Jan',
        'https://example.com/reset',
        'en',
      );
      expect(firstCall(transport.calls).subject).toBe('Reset your CarNotea password');
    });

    it('includes the action URL in text', async () => {
      const url = 'https://example.com/reset?token=xyz';
      await service.sendPasswordResetEmail('user@example.com', 'Jan', url, 'en');
      expect(firstCall(transport.calls).text).toContain(url);
    });

    it('does not throw when transport fails (enumeration-safe)', async () => {
      const failingTransport: EmailTransport = {
        send: vi.fn().mockRejectedValue(new Error('SMTP error')),
      };
      const svc = createEmailService({ transport: failingTransport });
      await expect(
        svc.sendPasswordResetEmail('user@example.com', 'Jan', 'https://example.com/reset', 'en'),
      ).resolves.toBeUndefined();
    });
  });
});
