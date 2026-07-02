# Redesign — "Cockpit + Dziennik" (master plan)

> **This is the authoritative plan.** A fresh agent (or human) should be able to
> read this top-to-bottom and continue the work without prior context. It is
> written to the repo's conventions in [`AGENTS.md`](../../AGENTS.md). Keep the
> **Status tracker** at the bottom honest — it is how the next agent knows where
> to resume.

- **Approved direction:** the minimal version. See the static reference:
  [`prototype.html`](./prototype.html) (open in a browser).
- **Epic ticket:** [`T-069`](../../tickets/T-069-redesign-cockpit-logbook.md).
- **What the user approved, in their words:** a main screen that is a feed
  ("ala feed, wszystkie rzeczy łącznie"), with a **minimal panel** above it — no
  gradients, no glow, no gimmicks.

---

## 1. Vision & information architecture

We replace the current "stat-card grid + six separate list tabs" home with two
ideas:

1. **Vehicle panel (minimal).** A flat white card at the top of the home screen
   showing the active vehicle's identity and a hairline-separated **readout** of
   vitals: `Przebieg · Naładowanie/Paliwo · Następny serwis · Koszty / mc`.
   Flat surfaces, tabular numerals, one accent used only semantically. No dark
   cockpit, no gradients, no donuts (those were rejected in iteration 2).

2. **Logbook feed (`Dziennik`).** One reverse-chronological stream of **all**
   events for the active vehicle — charging, fuel, service, expense, issue,
   reminder — interleaved by date, each row an icon + title + key number. Filter
   chips narrow by type. This is the literal "vehicle diary" and the hero of the
   screen.

The six per-type screens (fuel, charging, service, issues, expenses, reminders)
**stay** for focused entry/editing — the feed is an aggregated read view, not a
replacement for them. "Dodaj wpis" opens the existing quick-add flow.

Navigation becomes a **flat icon rail** on desktop (was: top bar + wide
sidebar); mobile keeps the existing bottom nav. The rail is light (paper +
hairline), active item = green text + a 3px left marker.

### Screen map (target)

```
Home (/dashboard)
├── Top bar:   greeting + vehicle switcher
├── Panel:     identity + vitals readout            ← VehiclePanel  (NEW)
└── Logbook:   filter chips + chronological feed     ← ActivityFeed  (NEW)

Per-type screens (unchanged routes, restyled cards already done):
/vehicles/$id/{fuel,charging,service,issues,expenses,reminders}
```

---

## 2. Design system (foundation — already in place)

The visual foundation landed before this plan (see memory
`carnotea-design-system`). Reuse it; do **not** reinvent tokens.

- **Tokens:** `apps/web/src/styles/globals.css`. Heritage-green accent
  `--primary: 150 50% 24%`, ink-on-paper neutrals, `success/warning/destructive`
  tonal tokens, `--radius: 0.75rem`.
- **Fonts:** self-hosted variable **Space Grotesk** (`font-display`, all
  numerals) + **Inter** (`font-sans`) in `apps/web/public/fonts/`.
- **Utilities:** `.tnum` (tabular numerals) and `.label-micro` (uppercase data
  caption) in `globals.css`.
- **Primitives:** `Card/Button/Badge/Input/Select` (shadcn, restyled),
  `PageHeader`, `EmptyState`, `ErrorState`.
- **Shared list system:** `ListCard`, `LogCard`, `StatStrip`, `ListCardActions`
  in `apps/web/src/components/` (memory `carnotea-list-card-architecture`). The
  `StatStrip` readout is the same device the panel's vitals row uses — keep them
  visually identical.

**Rule:** React shared components live in `apps/web/src/components/` (PascalCase
files). `@carnotea/shared` is Zod-schemas/types only — no React there.

---

## 3. Architecture decision — aggregation lives on the backend

The feed and the panel each aggregate across six resources. Two options:

- **(A) Client-side merge** — fetch all six lists, merge + sort in the browser.
  Rejected: fetches everything, no pagination, re-implements sorting per client,
  and the "this month vs last" / "avg consumption" maths would duplicate the
  backend.
- **(B) Backend aggregation endpoints** — **chosen.** The repo already has this
  pattern: `apps/api/src/dashboard/` unions across tables with Drizzle and
  returns typed, user-scoped DTOs. We add two endpoints that follow it exactly.

### New endpoints (contract frozen here)

| Method | Path                                 | Auth    | Success                    | Errors                    |
| ------ | ------------------------------------ | ------- | -------------------------- | ------------------------- |
| GET    | `/api/vehicles/{vehicleId}/activity` | session | 200 `ActivityFeedResponse` | 404 NOT_FOUND (not owner) |
| GET    | `/api/vehicles/{vehicleId}/panel`    | session | 200 `VehiclePanel`         | 404 NOT_FOUND (not owner) |

Add both to `ROUTES` in `packages/shared/src/routes.ts` as
`vehicleActivity` and `vehiclePanel`.

`GET …/activity` accepts `?limit` (default 30, max 100) and `?cursor` (opaque
keyset cursor over `(occurredAt, id)` descending). Cross-user access returns 404
(same isolation rule as every other vehicle-scoped route — copy the ownership
guard the existing controllers use).

---

## 4. Shared contracts (`@carnotea/shared`) — build these FIRST

Boundary-first: the Zod schemas are the foundation everything else derives from.
Follow `packages/shared/AGENTS.md` (schema-per-entity) and reuse the field
helpers in `schemas/_shared.ts` (`uuidField`, `dateField`, `moneyField`,
`mileageField`, …). Derive all types with `z.infer`.

### 4a. `schemas/activity.ts`

`ActivityEntry` is a **discriminated union on `kind`**, so the web can render and
translate each kind itself (i18n is web-side, never bake pl/en into the API).
Each variant reuses the fields the existing per-resource schemas already expose.

```
ActivityKind = 'fuel' | 'charge' | 'service' | 'expense' | 'issue' | 'reminder'

base fields (every variant): id (uuid), kind, vehicleId (uuid),
  occurredAt (dateField — the event's own date), mileage (mileageField nullable)

fuel:     liters (positiveDecimal), totalCost (money), isFullTank, stationName?
charge:   energyKwh (positiveDecimal), totalCost (money), chargerType,
          isFullCharge, stationName?, socStartPercent?, socEndPercent?
service:  title, totalCost (money), workshopName?, partCount (int)
expense:  category (enum EXPENSE_CATEGORY_CODES), amount (money),
          description?, isAutoSynced
issue:    title, status, priority
reminder: title, status, dueState, dueDate?, dueMileage?

ActivityFeedResponseSchema = { items: ActivityEntry[], nextCursor: string|null }
ActivityQuerySchema = { limit?: 1..100 default 30, cursor?: string }
```

### 4b. `schemas/vehicle-panel.ts`

Vitals are **derived and partly optional** — only compute what the data
supports; everything uncertain is nullable. Do **not** invent data we don't
store.

```
VehiclePanelSchema = {
  vehicleId, brand, model, productionYear, fuelType, currentMileage, currency,
  energy:        { kind: 'charge'|'fuel'|'none', socPercent?, rangeKm? } | null
                 // charge%: latest charging session socEndPercent (EV/hybrid only); else null
  nextService:   { dueDate?, dueInKm?, dueState } | null   // nearest pending service-ish reminder
  monthCost:     { total (money), currency, prevTotal (money) }  // this calendar month vs previous
  avgConsumption:{ value, unit: 'l_per_100km'|'kwh_per_100km' } | null
}
```

Export both from `schemas/index.ts`. Add focused unit tests
(`activity.test.ts`, `vehicle-panel.test.ts`) mirroring existing schema tests:
parse a valid object per kind, reject a bad discriminant, assert the money/date
coercions.

---

## 5. Backend (`apps/api`)

Follow `apps/api/src/dashboard/` and the per-resource modules
(`charging-sessions`, `service-records`, …). New module
`apps/api/src/activity/` (or extend `vehicles`), wired with `zodRoute`,
`AuthGuard`, `@CurrentUser`, ownership check.

- **`activity.service.ts`** — `getActivity(userId, vehicleId, { limit, cursor })`.
  Verify the vehicle belongs to the user (404 otherwise). Build the feed with a
  **single SQL `UNION ALL`** across the six tables, each `SELECT` projecting the
  common shape + a `kind` literal + the variant columns, ordered by
  `(occurred_at DESC, id DESC)`, `LIMIT limit+1` for the cursor. Decode/encode
  the keyset cursor (base64 of `occurredAt|id`). This keeps pagination in the DB
  — do not over-fetch. (If a single UNION proves too gnarly with Drizzle, fall
  back to six bounded queries merged in the service, but keep the keyset
  semantics.)
- **`panel.service.ts`** (or a method on the same service) —
  `getPanel(userId, vehicleId)`. Reuse `computeDueState` from `@carnotea/shared`
  for `nextService`; reuse the month-spend / consumption SQL shapes from
  `DashboardService` (extract a shared helper rather than copy-paste if it grows).
- **Controllers** mirror `dashboard.controller.ts`: `zodRoute` per endpoint,
  schema-validated responses, `*.controller.test.ts` covering happy path + the
  cross-user 404 (the test matrix below).

### Test matrix (API)

| Case                          | Input                     | Expected                             |
| ----------------------------- | ------------------------- | ------------------------------------ |
| feed happy path               | vehicle with mixed events | 200, items sorted occurredAt ↓       |
| feed pagination               | `limit=2` then `cursor=…` | stable keyset, no dup/gap            |
| feed empty                    | vehicle with no events    | 200 `{ items: [], nextCursor:null }` |
| feed cross-user isolation     | another user's vehicleId  | 404 NOT_FOUND                        |
| panel happy path (EV)         | EV with charge + expenses | 200, energy.kind='charge'            |
| panel happy path (combustion) | diesel, no charging       | 200, energy.kind='fuel'/null         |
| panel cross-user isolation    | another user's vehicleId  | 404 NOT_FOUND                        |

---

## 6. Web data layer (`apps/web`)

- `features/activity/queries.ts` — `activityFeedQueryOptions(vehicleId)`
  (use `useInfiniteQuery` for the cursor) and `vehiclePanelQueryOptions(vehicleId)`,
  following `features/dashboard/queries.ts` and the typed `apiClient`.
- Query keys: `['activity', vehicleId]`, `['vehicle-panel', vehicleId]`.

## 7. Web UI (`apps/web`)

New components in `apps/web/src/components/` and `features/activity/`:

- **`VehiclePanel`** (`features/activity/components/vehicle-panel.tsx`) — the flat
  card from the prototype. Vitals row reuses the `StatStrip` look (or `StatStrip`
  directly) so the panel and list cards share one readout language. Money via
  `formatMoney`, distances via `formatDistanceKm`, all numerals `.tnum`.
- **`ActivityFeed`** (`features/activity/components/activity-feed.tsx`) — filter
  chips (Wszystko / per kind) + date-grouped list, infinite scroll, empty/error
  states via `EmptyState`/`ErrorState`.
- **`ActivityEntry`** (`…/activity-entry.tsx`) — switches on `entry.kind` and
  renders the icon chip + title + meta + right-aligned key number. One translated
  string builder per kind (pl + en — keep both files in sync, ADR-0007).
- **Shell:** restyle `components/layout/app-shell.tsx` + `nav.tsx` into the flat
  icon rail (desktop). Mobile `bottom-nav.tsx` stays. Keep the vehicle switcher.
- **Route:** rebuild `features/dashboard/dashboard-page.tsx` to compose
  `VehiclePanel` + `ActivityFeed`. Keep the old dashboard widgets
  (`expense-by-category`, `monthly-spend`, `upcoming-reminders`) available but
  secondary — decide in Phase 5 whether they move to a `/stats` view or a panel
  expander. **Ask the user before deleting them.**

### i18n

New namespace `activity` (pl + en) for feed/panel strings: filter labels, kind
titles, vitals labels, empty states. Register it like the other namespaces. Every
user-facing string goes through i18n — no hard-coded text (AGENTS.md).

---

## 8. Phases & tickets

Each phase is one PR-sized ticket. Cut the ticket from this section when you pick
it up; keep `T-069` as the tracking epic.

| Phase | Ticket | Scope                                                                    | Depends on |
| ----- | ------ | ------------------------------------------------------------------------ | ---------- |
| P1    | T-070  | Shared contracts: `activity.ts` + `vehicle-panel.ts` + ROUTES + tests    | —          |
| P2    | T-071  | API: activity feed endpoint (union + keyset pagination) + tests          | P1         |
| P3    | T-072  | API: vehicle panel endpoint (vitals) + tests                             | P1         |
| P4    | T-073  | Web: data layer + `VehiclePanel` + `ActivityFeed`/`ActivityEntry` + i18n | P2, P3     |
| P5    | T-074  | Web: flat icon-rail shell + new dashboard route composition              | P4         |
| P6    | T-075  | Web: mobile pass + entry-detail/quick-add polish + a11y/reduced-motion   | P5         |

> Do **P5's** decision about the old dashboard widgets with the user (Ask First).

## 9. Validation (every phase)

From repo root, the smallest relevant set (AGENTS.md § Validation Commands):

```
pnpm --filter @carnotea/shared test        # P1
pnpm --filter @carnotea/api test            # P2, P3
pnpm --filter @carnotea/web test            # P4–P6
pnpm lint && pnpm typecheck && pnpm build
```

UI phases: verify in a browser (agent-browser is configured; if it can't reach a
browser, render the component and self-review). A change is done only when the
ticket's ACs are all true and docs touched are updated in the same commit.

---

## 10. Status tracker ← **READ THIS FIRST when resuming**

- [x] Direction approved (minimal "Cockpit + Dziennik"). Prototype: `prototype.html`.
- [x] Design-system foundation already merged (tokens, fonts, primitives,
      list-card system). Memories: `carnotea-design-system`,
      `carnotea-list-card-architecture`.
- [x] **P1 (T-070) — DONE:** shared `activity.ts` + `vehicle-panel.ts` schemas +
      ROUTES (`vehicleActivity`, `vehiclePanel`) + unit tests. `@carnotea/shared`
      test/typecheck/lint all green (64 tests).
- [x] **P2 (T-071) — DONE:** `apps/api/src/activity/` feed endpoint (5-source
      merge + keyset pagination + ownership 404). Controller tests pass; feed,
      pagination (no dup/gap), and cross-user 404 verified live against the
      seeded DB this session.
- [x] **P3 (T-072) — DONE:** vehicle panel endpoint (energy / nextService /
      monthCost / avgConsumption). Verified live (EV returns `energy.kind:'charge'`,
      real month totals + nextService dueState).
- [x] **P4 (T-073) — CODE COMPLETE:** `features/activity/` queries +
      `VehiclePanelCard` + `ActivityFeed` + `ActivityEntry`, `activity` i18n ns
      (pl/en parity checked). typecheck/lint/test/build all green. **Not** re-
      verified in a browser at audit time (Docker was down) — do a visual pass
      when the stack is up.
- [x] **P5 (T-074) — CODE COMPLETE:** flat icon rail in `nav.tsx`; `/dashboard`
      composes panel + feed, old analytics widgets kept below under a section
      header. Same browser-verification caveat as P4.
- [ ] P6 (T-075) — Mobile + detail/quick-add + a11y review — **outstanding**.
- [ ] T-076 — minimalist E2 logo/favicon — **in progress** (separate track).

**Repo gates at audit (2026-07-01):** `pnpm typecheck` ✓ · `pnpm lint` ✓ ·
`pnpm test` ✓ (shared 64, api 173 + activity controller 7; integration tests
skipped by repo convention) · `pnpm build` ✓ · `pnpm format:check` ✓ (fixed).
`codegen:api:check` not run (API offline at audit); `schema.d.ts` was regenerated
from the live API earlier this session.

**Next concrete step:** bring the stack up (`pnpm db:up && pnpm dev`), run
`pnpm --filter @carnotea/web codegen:api:check` to confirm no OpenAPI drift, then
do the browser pass for P4/P5 and continue P6 (T-075) mobile + a11y.

```

```
