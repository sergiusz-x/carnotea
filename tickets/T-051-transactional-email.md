---
id: T-051
title: Transactional email for better-auth flows (verification + password reset)
status: ready
priority: high
owner: ~
dependencies: [T-006]
labels: [account, email]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-051 — Transactional email for better-auth flows (verification + password reset)

## Goal

Send branded, bilingual transactional emails (email verification and password
reset) for the better-auth flows through a configurable provider, with a
zero-secrets local preview so the flows are testable end-to-end in dev.

## Context

T-006 wired better-auth but left its email hooks as no-ops: verification links
and reset links are generated but never delivered, so neither flow actually
completes. better-auth exposes `sendVerificationEmail` and
`sendResetPassword` (and re-send) callbacks that need a real transport behind
them. We must also honour ADR-0007 — every user-facing string, including email
copy, exists in both `pl` and `en` — and the EU audience means the sender domain
and reply-to must be configurable rather than hard-coded.

## Acceptance criteria

- [ ] An email transport is configured from env (SMTP host/port/user/pass plus
      `EMAIL_FROM` / `EMAIL_REPLY_TO`); selecting/credentialing the provider is
      env-only, no secrets committed.
- [ ] The env vars are validated with **Zod** in the API env schema; in
      development a missing provider falls back to the local preview transport,
      not a boot error.
- [ ] better-auth's `sendVerificationEmail` and `sendResetPassword` (plus
      re-send) callbacks are implemented and actually deliver via the transport.
- [ ] Verification and password-reset emails have **both** `pl` and `en`
      templates (subject + body), chosen from the user's persisted locale with
      `en` as fallback, per ADR-0007.
- [ ] Templates render the correct action URL built from `BETTER_AUTH_URL` /
      `VITE_API_URL`; links resolve to the right web routes.
- [ ] Local dev uses **Mailpit** (added to `docker-compose.yml`) so emails are
      captured and previewable at its web UI without sending real mail.
- [ ] `.env.example` documents the new `EMAIL_*` / SMTP vars with safe,
      commented defaults pointing at the local Mailpit instance.

## Files to touch

- `apps/api/src/auth/` — better-auth email callbacks wiring
- `apps/api/src/email/` (new) — transport + template rendering
- `apps/api/src/config/env.ts` — `EMAIL_*` / SMTP Zod schema
- `apps/web/src/i18n/locales/{pl,en}/*` or an email locale namespace
- `docker-compose.yml` — Mailpit service
- `.env.example`
- `docs/getting-started.md`, `apps/api/AGENTS.md`

## Out of scope

- Marketing / digest / notification emails (reminders → T-055 push, separate).
- HTML design system / MJML pipeline — keep templates minimal and inline.
- Bounce/complaint webhooks, deliverability monitoring, DKIM/SPF DNS setup.
- Magic-link or OTP login flows.

## Implementation notes

- Use a thin transport (e.g. `nodemailer` over SMTP) so swapping providers in
  prod is env-only; verify the latest stable version via `pnpm info` before
  pinning (root AGENTS.md).
- Keep subjects/bodies in i18next so they share the `pl`/`en` discipline with
  the UI; render with the user's stored locale, fall back to `en`.
- Mailpit speaks SMTP and ships a web inbox — point the dev SMTP vars at it so
  no real credentials ever touch the repo.
- Do not throw on send failure inside the auth callback in a way that leaks
  whether an account exists (reset flow must stay enumeration-safe).

## References

- ADR: [ADR-0004](../docs/adr/0004-better-auth.md), [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
- Related tickets: T-006 (better-auth integration), T-010 (i18n), T-029 (profile/locale)
- External: better-auth email hooks; Mailpit — <https://mailpit.axllent.org/>
