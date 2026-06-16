---
id: T-053
title: Privacy Policy and Terms of Service pages
status: ready
priority: medium
owner: ~
dependencies: [T-007, T-010]
labels: [compliance, web]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-053 — Privacy Policy and Terms of Service pages

## Goal

Ship bilingual Privacy Policy and Terms of Service pages, linked from the footer
and the auth screens, so EU users have the legal disclosures required before
they create an account.

## Context

Before real users sign up we must disclose what data we collect and on what
terms — a baseline GDPR/consumer requirement for an EU audience. The web
skeleton (T-007) gives us routing and the i18n layer (T-010) gives us the
`pl`/`en` discipline every user-facing string must follow (ADR-0007). The app
currently ships **no analytics and no third-party trackers**, so there is no
non-essential cookie to consent to today; this ticket documents that state and
leaves a clearly-marked hook so a future analytics ticket can add a consent
banner without reworking these pages.

## Acceptance criteria

- [ ] A `/privacy` route renders the Privacy Policy and a `/terms` route renders
      the Terms of Service.
- [ ] Both pages render in **pl** and **en** from the i18n layer and follow the
      active/persisted locale (ADR-0007); no hard-coded strings in JSX.
- [ ] Both pages are linked from the app footer and from the sign-in / sign-up
      screens.
- [ ] The Privacy Policy accurately states current data handling: account email + diary data stored in our own Postgres, transactional email only, **no
      analytics / no third-party trackers**, and references the export/delete
      rights (T-052).
- [ ] The policy names the cookies actually in use (only the essential
      better-auth session cookie) and states no consent banner is required while
      no non-essential cookies exist.
- [ ] A documented, currently-inert consent hook exists (e.g. a `<ConsentGate>`
      / config flag) so adding analytics later only flips it on — but it ships
      **off** and renders nothing now.
- [ ] Pages are reachable without authentication.

## Files to touch

- `apps/web/src/routes/privacy.tsx`, `apps/web/src/routes/terms.tsx` (new)
- `apps/web/src/components/Footer.tsx` (links)
- `apps/web/src/routes/auth/*` (links on sign-in/up)
- `apps/web/src/i18n/locales/{pl,en}/legal.*` (new namespace)
- `apps/web/src/consent/` (new, inert) — consent hook scaffold
- `docs/architecture.md` (privacy/consent note)

## Out of scope

- Actually adding analytics or any tracker, and a live cookie-consent banner —
  that is a separate ticket that flips the inert hook on.
- Legal review / final wording sign-off (placeholder copy, marked as such, until
  a human approves it).
- Cookie-preference persistence and granular consent categories.

## Implementation notes

- Keep the legal copy in i18n resources so translation stays in lockstep; long
  prose can live in a dedicated `legal` namespace rather than the main bundle.
- Do not invent a consent UI now (no speculative code per AGENTS.md "Never") —
  ship only the documented seam, off by default, rendering nothing.
- Cross-link the Privacy Policy to the data export/delete feature (T-052) so the
  user-rights story is consistent.
- Treat the copy as placeholder pending human/legal approval; flag it clearly in
  the page and the ticket notes — don't claim it's legally vetted.

## References

- ADR: [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
- Related tickets: T-007 (web skeleton), T-010 (i18n), T-052 (GDPR export/delete)
- External: GDPR transparency obligations; ePrivacy cookie consent
