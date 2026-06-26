import { Logger } from '@nestjs/common';

const logger = new Logger('EmailService');

export const emailService = {
  sendPasswordResetEmail(to: string, firstName: string, url: string): void {
    logger.log(`[DEV] Password reset email to ${to} (${firstName}): ${url}`);
  },

  sendVerificationEmail(to: string, firstName: string, url: string): void {
    logger.log(`[DEV] Verification email to ${to} (${firstName}): ${url}`);
  },
};
