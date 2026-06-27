import nodemailer, { type Transporter } from 'nodemailer';

export interface TransportConfig {
  smtpHost: string | undefined;
  smtpPort: number;
  smtpUser: string | undefined;
  smtpPass: string | undefined;
  emailFrom: string;
  emailReplyTo: string;
  isDev: boolean;
}

// Fallback SMTP settings for Mailpit (local dev only).
const MAILPIT_HOST = 'localhost';
const MAILPIT_PORT = 1025;

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

export function createEmailTransport(config: TransportConfig): EmailTransport {
  let transporter: Transporter;

  if (config.smtpHost) {
    // Real SMTP provider configured via env.
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth:
        config.smtpUser && config.smtpPass
          ? { user: config.smtpUser, pass: config.smtpPass }
          : undefined,
    });
  } else if (config.isDev) {
    // Dev fallback: Mailpit (no credentials needed).
    transporter = nodemailer.createTransport({
      host: MAILPIT_HOST,
      port: MAILPIT_PORT,
      secure: false,
    });
  } else {
    // Production with no SMTP configured: throw at startup so the misconfiguration
    // is visible immediately rather than silently swallowed at send time.
    throw new Error(
      'EMAIL: SMTP_HOST is required in production. Set it in your environment or secrets.',
    );
  }

  return {
    async send(message: EmailMessage): Promise<void> {
      await transporter.sendMail({
        from: config.emailFrom,
        replyTo: config.emailReplyTo,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
  };
}
