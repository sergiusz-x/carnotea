import { createRequire } from 'node:module';

import i18next from 'i18next';

const _require = createRequire(import.meta.url);

const enLocale = _require('./locales/en.json') as Record<string, unknown>;

const plLocale = _require('./locales/pl.json') as Record<string, unknown>;

// i18next.init is async but the library also exposes a synchronous path when
// all resources are bundled (no async backend). We fire-and-forget the init
// promise here; by the time any email is sent the module will have settled.
// If, for any reason, init hasn't resolved, i18next falls back to the key.
const _initPromise = i18next.init({
  resources: {
    en: { email: enLocale },
    pl: { email: plLocale },
  },
  defaultNS: 'email',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Export for test assertions.
export const initPromise: Promise<unknown> = _initPromise;

export type SupportedLocale = 'pl' | 'en';

function t(key: string, locale: SupportedLocale, vars?: Record<string, string>): string {
  return i18next.t(key, { lng: locale, ...vars });
}

export interface VerificationEmailContent {
  subject: string;
  text: string;
  html: string;
}

export function renderVerificationEmail(
  firstName: string,
  url: string,
  locale: SupportedLocale,
): VerificationEmailContent {
  const subject = t('verification.subject', locale);
  const greeting = t('verification.greeting', locale, { name: firstName || 'there' });
  const body = t('verification.body', locale);
  const cta = t('verification.cta', locale);
  const fallback = t('verification.fallback', locale);
  const ignore = t('verification.ignore', locale);
  const footer = t('verification.footer', locale);

  const text = `${greeting}\n\n${body}\n\n${cta}: ${url}\n\n${fallback}\n${url}\n\n${ignore}\n\n${footer}`;
  const html = buildHtml({ greeting, body, cta, url, fallback, ignore, footer });

  return { subject, text, html };
}

export interface PasswordResetEmailContent {
  subject: string;
  text: string;
  html: string;
}

export function renderPasswordResetEmail(
  firstName: string,
  url: string,
  locale: SupportedLocale,
): PasswordResetEmailContent {
  const subject = t('passwordReset.subject', locale);
  const greeting = t('passwordReset.greeting', locale, { name: firstName || 'there' });
  const body = t('passwordReset.body', locale);
  const cta = t('passwordReset.cta', locale);
  const fallback = t('passwordReset.fallback', locale);
  const ignore = t('passwordReset.ignore', locale);
  const footer = t('passwordReset.footer', locale);

  const text = `${greeting}\n\n${body}\n\n${cta}: ${url}\n\n${fallback}\n${url}\n\n${ignore}\n\n${footer}`;
  const html = buildHtml({ greeting, body, cta, url, fallback, ignore, footer });

  return { subject, text, html };
}

// Minimal inline HTML — no MJML, no design system (out of scope per T-051).
function buildHtml(parts: {
  greeting: string;
  body: string;
  cta: string;
  url: string;
  fallback: string;
  ignore: string;
  footer: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CarNotea</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:40px;max-width:560px;">
        <tr><td>
          <h1 style="margin:0 0 8px;font-size:22px;color:#111;">CarNotea</h1>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">${parts.greeting}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;">${parts.body}</p>
          <a href="${parts.url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">${parts.cta}</a>
          <p style="margin:24px 0 8px;font-size:13px;color:#6b7280;">${parts.fallback}</p>
          <p style="margin:0 0 24px;font-size:13px;color:#6b7280;word-break:break-all;">${parts.url}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
          <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">${parts.ignore}</p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">${parts.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
