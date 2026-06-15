---
id: T-054
title: PWA offline-first caching and queued-mutation sync
status: ready
priority: low
owner: ~
dependencies: [T-012]
labels: [pwa]
created_at: 2026-06-15
updated_at: 2026-06-15
closed_at: ~
---

# T-054 — PWA offline-first caching and queued-mutation sync

## Goal

Add the offline-first layer ADR-0006 deferred: cache the app shell and read data
so the diary is usable with no connection, and queue mutations made offline so
they reconcile with the API when connectivity returns.

## Context

ADR-0006 shipped only the _installable_ PWA layer in T-012 — a manifest plus a
minimal service worker that deliberately does **not** cache API responses — and
explicitly punted offline-first to its own ticket once real workflows existed.
They now do: logging a fill-up or a service entry is exactly the moment a user is
in a garage or roadside with poor signal. This ticket builds the caching +
sync depth on top of the existing service worker.

## Acceptance criteria

- [ ] The app **shell** (HTML/JS/CSS/icons) is precached so the app loads and
      renders while fully offline.
- [ ] Read data for core diary views (vehicles, recent logs/expenses/reminders)
      is cached with a documented strategy (e.g. stale-while-revalidate) and
      served when offline.
- [ ] Mutations performed offline (e.g. add a log/expense) are **queued durably**
      and replayed against the API once back online, then reflected in the UI.
- [ ] Replay is ordered and **idempotent** so a flaky reconnect can't double-write
      (client-generated ids or a dedupe key).
- [ ] The UI shows clear offline / pending-sync / synced state, with **pl** and
      **en** copy for those states (ADR-0007).
- [ ] Sync conflicts have a defined, documented resolution (e.g. last-write-wins
      with a surfaced notice) — no silent data loss.
- [ ] A new service-worker version activates cleanly and migrates/empties stale
      caches without breaking an installed client.
- [ ] Offline load, offline create, and reconnect-replay are verified in
      agent-browser and captured in the PR notes.

## Files to touch

- `apps/web/` service-worker / `vite-plugin-pwa` Workbox config
- `apps/web/src/offline/` (new) — mutation queue + sync runner
- `apps/web/src/lib/api-client` — queue-aware mutation path (T-011)
- TanStack Query persistence/cache wiring (T-009)
- `apps/web/src/i18n/locales/{pl,en}/*` (offline/sync states)
- `apps/web/AGENTS.md`, `docs/architecture.md`

## Out of scope

- Push notifications (T-055).
- Full local-first / CRDT replication or multi-device merge — single-user,
  queue-and-replay only.
- Offline auth (sign-in still requires connectivity).
- Caching large binary assets (photos/attachments) — defer.

## Implementation notes

- Prefer Workbox via `vite-plugin-pwa` to extend the existing SW rather than
  hand-rolling; verify latest stable versions with `pnpm info` (root AGENTS.md).
- Persist the mutation queue and cached reads in IndexedDB; the Background Sync
  API is unreliable cross-browser (notably iOS), so back it with an
  on-`online`/foreground replay so it works everywhere.
- Generate client-side ids for offline-created records so replay is idempotent
  and the UI can show the row immediately (optimistic), then reconcile.
- Keep the API contract unchanged — this is additive web work; do not change
  route shapes for the queue.

## References

- ADR: [ADR-0006](../docs/adr/0006-pwa-from-day-one.md) (this is the deferred depth)
- Related tickets: T-012 (installable PWA / base SW), T-009 (TanStack Query),
  T-011 (typed API client)
- External: Workbox; `vite-plugin-pwa` — <https://vite-pwa-org.netlify.app/>
