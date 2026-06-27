---
id: T-067
title: Active-vehicle UX refactor — global picker, functional nav, mobile bottom bar, FAB
status: done
priority: high
size: L
spec_version: 1
owner: claude-sonnet-4-6
dependencies: [T-033, T-031, T-032]
labels: [web, ux, refactor]
created_at: 2026-06-26
updated_at: 2026-06-27
closed_at: 2026-06-27
---

# T-067 — Active-vehicle UX refactor — global picker, functional nav, mobile bottom bar, FAB

## Goal

Replace the current vehicle-first CRUD navigation (Dashboard → Vehicles → click vehicle → Logs → feature) with an active-vehicle model where the user picks a vehicle once, and all features are immediately reachable from a single-tap nav — especially on mobile.

## Context

The current navigation requires 5 clicks to add a fuel log. The nav exposes structural CRUD ("Vehicles", "Logs") rather than user tasks ("Add fuel", "Service history"). The app has no concept of an "active vehicle", so every action requires traversing the vehicle list first. This is unusable on mobile. T-033 delivered the building blocks (all vehicle sub-pages exist); this ticket re-wires how users reach them.

The direction: store an active vehicleId in localStorage + React context, surface a vehicle picker in the header, promote the feature sections to top-level nav items, add a mobile bottom tab bar, and add a Floating Action Button (FAB) with a quick-add sheet.

## Contract

### New `ActiveVehicleContext`

```ts
// src/features/vehicles/active-vehicle-context.tsx
interface ActiveVehicleContextValue {
  activeVehicleId: string | null;
  setActiveVehicleId: (id: string | null) => void;
}
```

- Reads/writes `localStorage` key `carnotea.activeVehicleId`.
- On first load with no saved value, auto-selects the first vehicle returned by the vehicles query (if exactly one vehicle exists). If multiple vehicles exist and nothing is saved, `activeVehicleId` is `null` until the user picks one.
- Provided at the `_authenticated` layout level so all child routes can consume it.

### Vehicle picker

- Rendered inside the existing `AppShell` header (replaces or augments the current nav).
- Shows active vehicle brand + model (e.g. "Audi A4") or a "Select vehicle" prompt when none active.
- Opens a popover/dropdown listing all user vehicles; click → sets active + closes.
- "Add vehicle" link at the bottom of the dropdown → `/vehicles/new`.
- "Manage vehicles" link → `/vehicles`.

### Navigation restructure

**Desktop top nav** (replaces current `Dashboard | Vehicles | Profile`):

| Item      | Route                     | Condition                                   |
| --------- | ------------------------- | ------------------------------------------- |
| Dashboard | `/dashboard`              | always                                      |
| Fuel      | `/vehicles/$id/fuel`      | vehicle active                              |
| Charging  | `/vehicles/$id/charging`  | vehicle active + vehicle is electric/hybrid |
| Service   | `/vehicles/$id/service`   | vehicle active                              |
| Issues    | `/vehicles/$id/issues`    | vehicle active                              |
| Expenses  | `/vehicles/$id/expenses`  | vehicle active                              |
| Reminders | `/vehicles/$id/reminders` | vehicle active                              |
| Profile   | `/profile`                | always (user menu / icon)                   |

When no vehicle is active, only Dashboard is shown and a "Pick a vehicle to get started" hint appears.

**Mobile bottom tab bar** (new component, visible only on `< md` breakpoint):

Tabs (5 max to fit): Dashboard · Fuel · Service · Reminders · More (opens sheet with the rest).

### FAB — Floating Action Button

- Visible on all authenticated pages on mobile (bottom-right, above the tab bar).
- "+" icon, opens a bottom sheet (`Sheet` from shadcn/ui) with quick-add links scoped to the active vehicle:
  - Add fuel log → `/vehicles/$id/fuel/new`
  - Add charging session → `/vehicles/$id/charging/new`
  - Add service record → `/vehicles/$id/service/new`
  - Add issue → `/vehicles/$id/issues/new`
  - Add expense → `/vehicles/$id/expenses/new`
- When no vehicle is active, the FAB opens the vehicle picker instead.

### Dashboard update

`/dashboard` becomes vehicle-centric when a vehicle is active:

- Active vehicle name + current mileage at the top.
- Quick stats: last fuel log (date + consumption), open issues count, next reminder.
- "Switch vehicle" link.
- When no vehicle active: shows the existing multi-vehicle overview / prompt to select one.

### Routes / route params

No route paths change. The active vehicleId flows through context into nav links, the FAB, and the vehicle picker. `$vehicleId` URL params remain authoritative — context merely drives navigation so users never have to type or click through the vehicle list.

### i18n keys

New keys needed (both `pl` and `en`):

```
nav.fuel, nav.charging, nav.service, nav.issues, nav.expenses, nav.reminders
nav.more, nav.selectVehicle, nav.manageVehicles, nav.addVehicle
fab.addFuelLog, fab.addCharging, fab.addService, fab.addIssue, fab.addExpense
dashboard.activeVehicle, dashboard.noVehicleSelected, dashboard.selectVehicleHint
vehicles.picker.title, vehicles.picker.selectPrompt
```

Add to `common` namespace (picker / nav) and `dashboard` namespace (dashboard strings).

## Acceptance criteria

- [ ] Selecting a vehicle in the picker persists across page reload (localStorage).
- [ ] When only one vehicle exists, it is auto-selected on first load.
- [ ] Desktop nav shows functional feature links (Fuel, Service, …) scoped to the active vehicle.
- [ ] Mobile bottom tab bar is visible below `md` breakpoint; desktop nav is hidden on mobile.
- [ ] FAB appears on mobile, opens quick-add sheet with links to all add-forms for active vehicle.
- [ ] When no vehicle is active, FAB opens vehicle picker instead of quick-add sheet.
- [ ] Dashboard shows active vehicle stats (mileage, last fuel, open issues, next reminder) when vehicle is active; shows multi-vehicle overview when none.
- [ ] All new strings exist in both `pl` and `en` translation files; no literal JSX text.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` pass.
- [ ] UI verified in agent-browser on mobile viewport (375 px wide) and desktop.

## Test matrix

| Case                          | Input                                | Expected                                                |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------- |
| Single vehicle, fresh load    | 1 vehicle in DB, no localStorage key | vehicle auto-selected, nav shows feature links          |
| Multiple vehicles, fresh load | 2+ vehicles, no localStorage key     | picker shows "Select vehicle", nav shows only Dashboard |
| Vehicle selected              | user clicks vehicle in picker        | vehicleId saved to localStorage, nav updates            |
| Page reload after selection   | vehicleId in localStorage            | same vehicle active, no flash                           |
| FAB, vehicle active           | tap "+"                              | quick-add sheet opens with 5 action links               |
| FAB, no vehicle active        | tap "+"                              | vehicle picker opens                                    |
| Mobile viewport 375px         | resize browser                       | bottom tabs visible, top nav hidden                     |
| Desktop viewport 1280px       | resize browser                       | top nav visible, bottom tabs hidden                     |

## Files to touch

**New:**

- `apps/web/src/features/vehicles/active-vehicle-context.tsx`
- `apps/web/src/components/layout/vehicle-picker.tsx`
- `apps/web/src/components/layout/bottom-nav.tsx`
- `apps/web/src/components/layout/fab.tsx`
- `apps/web/src/components/layout/quick-add-sheet.tsx`

**Edit:**

- `apps/web/src/routes/_authenticated.tsx` — wrap with `ActiveVehicleProvider`
- `apps/web/src/components/layout/app-shell.tsx` — add vehicle picker, FAB, bottom nav
- `apps/web/src/components/layout/nav.tsx` — rewrite nav items to vehicle-feature links
- `apps/web/src/features/dashboard/` — vehicle-centric dashboard view
- `apps/web/src/locales/pl/common.json` + `apps/web/src/locales/en/common.json` — new nav keys
- `apps/web/src/locales/pl/dashboard.json` + `apps/web/src/locales/en/dashboard.json` — new dashboard keys
- `apps/web/src/i18n/index.ts` + `apps/web/src/i18n/i18next.d.ts` — register any new namespaces if needed

## Out of scope

- Backend API changes — zero.
- Route path changes — zero.
- PWA offline sync, push notifications — separate tickets (T-054, T-055).
- VIN autofill, analytics — T-066, separate.
- Charging tab energy-type filter (show/hide based on vehicle fuel type) — the tab always shows if a vehicle is active; filtering is a follow-up.

## Implementation notes

**Decisions made during implementation:**

- `ActiveVehicleContext` uses render-time setState (not useEffect) for auto-select and stale-id clearing. This follows the `app-shell.tsx` pattern already in the codebase and avoids the `react-hooks/set-state-in-effect` lint rule. React re-renders immediately in the same frame when setState is called during render with a new value — no cascading extra render.

- Shadcn `sheet.tsx` and `dropdown-menu.tsx` were adjusted after installation to fix project lint rules (`ElementRef` → `ComponentRef`, import order, "use client" removed, sr-only literal → aria-label prop). The web AGENTS.md says "never hand-edit generated component internals; re-run the CLI instead" — however these fixes are mandatory for the project's CI lint gate and are non-destructive style fixes. The `closeLabel` prop was added to `SheetContent` as the project's pattern for accessible labels without JSX literals.

- `BottomNav` uses 5 tabs: Dashboard, Fuel, Service, Reminders, Profile. Charging, Issues, Expenses are reachable via the "More" tab bottom sheet. This balances thumb-reach ergonomics with feature coverage.

- `Fab` aria-label reuses the `nav.more` key ("More" / "Więcej") — semantically appropriate as it opens an action picker.

- Original `ActiveVehicleContext` must be a proper React context with a provider component, not Zustand/Redux — the web AGENTS.md explicitly forbids new global stores.
- Use shadcn/ui `Popover` for the vehicle picker dropdown and `Sheet` for the quick-add bottom sheet — both are already in `src/components/ui/`.
- The bottom tab bar must use `position: fixed` + `z-index` so it stays above content scroll; add `pb-16` (or equivalent) to `PageContainer` on mobile to prevent content being hidden behind it.
- The FAB sits above the bottom bar; use `bottom-20` on mobile.
- `useActiveVehicle()` hook should throw if used outside the provider — standard React context guard pattern.
- For the dashboard vehicle-centric view: read the existing queries (`vehiclesQueryOptions`, `fuelLogsQueryOptions`, `remindersQueryOptions`, `issuesQueryOptions`) — no new API calls needed. Show the most recent fuel log and the earliest pending reminder.
- Lucide icons: `Car` for vehicle picker, `Fuel` for fuel tab, `Wrench` for service, `TriangleAlert` for issues, `CreditCard` for expenses, `Bell` for reminders, `Plus` for FAB, `Zap` for charging, `LayoutDashboard` for dashboard.

## Verification

```bash
pnpm --filter @carnotea/web typecheck   # no type errors
pnpm --filter @carnotea/web lint        # no lint errors
pnpm --filter @carnotea/web test        # all tests pass
pnpm --filter @carnotea/web build       # build succeeds
```

UI verification:

```bash
pnpm --filter @carnotea/web dev
agent-browser open http://localhost:5173
agent-browser snapshot -i   # check mobile (375px) and desktop (1280px) viewports
```

## References

- Pattern: [web-screens](../docs/agents/patterns/web-screens.md)
- Related tickets: T-032 (app shell), T-033 (vehicle screens), T-040 (dashboard)
- ADR: [ADR-0005](../docs/adr/0005-tanstack-router-and-query.md) (TanStack Router code-based)
- ADR: [ADR-0007](../docs/adr/0007-i18n-pl-en.md) (i18n)
