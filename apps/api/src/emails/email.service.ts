import { Logger } from '@nestjs/common';

import {
  type SupportedLocale,
  renderPasswordResetEmail,
  renderVerificationEmail,
} from './email.templates.js';
import { type EmailTransport } from './email.transport.js';

const logger = new Logger('EmailService');

export interface EmailServiceDeps {
  transport: EmailTransport;
}

export interface EmailService {
  sendVerificationEmail(
    to: string,
    firstName: string,
    url: string,
    locale?: SupportedLocale,
  ): Promise<void>;
  sendPasswordResetEmail(
    to: string,
    firstName: string,
    url: string,
    locale?: SupportedLocale,
  ): Promise<void>;
}

export function createEmailService(deps: EmailServiceDeps): EmailService {
  return {
    async sendVerificationEmail(to, firstName, url, locale = 'en'): Promise<void> {
      const content = renderVerificationEmail(firstName, url, locale);
      try {
        await deps.transport.send({ to, ...content });
        logger.log(`Verification email sent to ${to} [locale=${locale}]`);
      } catch (err) {
        // Log the failure but do NOT re-throw: the auth callback must be
        // enumeration-safe — a send failure must not reveal account existence.
        logger.error(`Failed to send verification email to ${to}: ${String(err)}`);
      }
    },

    async sendPasswordResetEmail(to, firstName, url, locale = 'en'): Promise<void> {
      const content = renderPasswordResetEmail(firstName, url, locale);
      try {
        await deps.transport.send({ to, ...content });
        logger.log(`Password reset email sent to ${to} [locale=${locale}]`);
      } catch (err) {
        // Same rationale: swallow silently so reset flow stays enumeration-safe.
        logger.error(`Failed to send password reset email to ${to}: ${String(err)}`);
      }
    },
  };
}
