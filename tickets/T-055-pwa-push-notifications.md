---
id: T-055
title: Web Push notifications for due reminders
status: ready
priority: medium
owner: ~
dependencies: [T-012, T-027]
labels: [pwa]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-055 — Web Push notifications for due reminders

## Goal

Deliver Web Push notifications when a vehicle reminder comes due, with opt-in
subscription management, VAPID keys from env, a server-side trigger in the
reminders domain, and bilingual notification copy.

## Context

ADR-0006 shipped only the _installable_ PWA layer in T-012 and explicitly
deferred push notifications to their own ticket. Reminders (T-027,
`packages/db/src/schema/reminders.ts`) already model a `dueDate` / `dueMileage`
and a `notifiedAt` timestamp — the schema anticipates a notifier that marks a
reminder once the user has been told. This ticket builds that path end to end:
the browser subscribes via the existing service worker, the API stores the
subscription and signs pushes with VAPID, and a server-side check fires a
notification for due reminders and stamps `notifiedAt` so it doesn't repeat.

## Acceptance criteria

- [ ] An authenticated user can **opt in** to push from the app (requesting
      `Notification` permission), and opt out again; the UI reflects the current
      permission/subscription state.
- [ ] The browser `PushSubscription` is persisted server-side, linked to the
      user, with multiple devices supported and stale subscriptions removed when a
      push returns `404`/`410`.
- [ ] VAPID keys are read from env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
      `VAPID_SUBJECT`), validated with **Zod**; the public key is exposed to the
      web build (e.g. `VITE_VAPID_PUBLIC_KEY`). No keys committed.
- [ ] A server-side trigger in the reminders domain finds reminders that are due
      and not yet notified and sends a push to the owner's subscriptions.
- [ ] After a successful push the reminder's `notifiedAt` is set so the same
      reminder is **not** notified twice.
- [ ] The service worker handles the `push` event and `notificationclick`,
      showing a notification and deep-linking to the relevant reminder/vehicle.
- [ ] Notification title/body and the opt-in UX copy exist in **both** `pl` and
      `en` (ADR-0007), selected from the user's persisted locale.
- [ ] Opt-in, receiving a push, and click-through deep-link are verified in
      agent-browser and captured in the PR notes.

## Files to touch

- `apps/web/` service worker — `push` + `notificationclick` handlers
- `apps/web/src/push/` (new) — subscribe/unsubscribe + permission UI
- `apps/api/src/push/` (new) — subscription store + VAPID sender
- `apps/api/src/reminders/` — due-reminder notifier + `notifiedAt` stamping
- `packages/db/src/schema/` — push-subscription table (+ `pnpm db:generate`)
- `apps/api/src/config/env.ts` — `VAPID_*` Zod schema
- `apps/web/src/i18n/locales/{pl,en}/*`, `.env.example`
- `apps/web/AGENTS.md`, `apps/api/AGENTS.md`

## Out of scope

- Offline-first caching and queued-mutation sync (T-054).
- Email reminder delivery (transactional email lives in T-051; this is push only).
- A general notification-preferences centre (per-category/quiet-hours) — a single
  reminders opt-in toggle is enough now.
- A durable scheduler/cron infrastructure decision — the trigger mechanism (poll
  vs. scheduled job) is chosen in this ticket but heavy infra is out of scope.
- iOS-specific install caveats beyond using the standard Web Push API.

## Implementation notes

- Use the standard Web Push protocol; on the server prefer the `web-push`
  library for VAPID signing — verify latest stable via `pnpm info` (root
  AGENTS.md). Generate keys with `web-push generate-vapid-keys`; never commit them.
- Store subscriptions keyed by endpoint so re-subscribing the same device
  upserts; prune on `404`/`410` responses from the push service.
- The due-reminder check can run from a lightweight scheduled task; keep it
  idempotent — gate strictly on `notifiedAt IS NULL` and the due condition so a
  re-run never double-sends.
- Notification payloads must carry enough to deep-link (reminder + vehicle id);
  keep copy in i18next so `pl`/`en` stay in lockstep with the UI.
- Push requires HTTPS (or `localhost`) and a registered service worker — build on
  T-012's SW, don't register a second one.

## References

- ADR: [ADR-0006](../docs/adr/0006-pwa-from-day-one.md) (push is the deferred depth),
  [ADR-0007](../docs/adr/0007-i18n-pl-en.md)
- Related tickets: T-012 (installable PWA / base SW), T-027 (reminders domain),
  T-054 (offline sync)
- External: MDN Push API — <https://developer.mozilla.org/docs/Web/API/Push_API>;
  `web-push` — <https://github.com/web-push-libs/web-push>
