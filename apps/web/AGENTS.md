# apps/web AGENTS.md

Area-specific rules for `@carnotea/web` — the Vite + React + TypeScript PWA.
These override the root `AGENTS.md` for any file under `apps/web/`.

## Structure

```
index.html          # Vite HTML entry — mounts #root
components.json     # shadcn/ui CLI configuration
src/
  main.tsx          # bootstrap: createRoot + ThemeProvider + RouterProvider
  App.tsx           # root component
  vite-env.d.ts     # Vite client ambient types
  styles/
    globals.css     # Tailwind v4 @import + shadcn CSS variable theme
  lib/
    utils.ts        # cn() helper (clsx + tailwind-merge)
    format.ts       # locale-aware Intl date/number helpers (active locale)
    queryClient.ts  # configured TanStack QueryClient (see Data below)
    router.ts       # assembles the route tree + creates the TanStack Router
  i18n/
    index.ts        # i18next init: bundled resources, detection, persistence
    i18next.d.ts    # type-safe t() keys derived from the `en` resources
  locales/
    <lang>/<namespace>.json   # pl + en translation files (see i18n below)
  components/
    ThemeProvider.tsx   # dark/light toggle context, persists to localStorage
    LanguageSwitcher.tsx # header pl/en picker (persists via i18next detector)
    Devtools.tsx        # dev-only Router + Query devtools (tree-shaken in prod)
    ui/                 # shadcn/ui components copied here by the CLI
  routes/             # app-level routes (root layout + index); see Routing below
    root.tsx          # root route + layout (Outlet + Devtools)
    index.tsx         # index route '/' → <App/>
  features/           # feature folders own their own routes.ts + queries.ts + components
    health/           # example feature wiring Router + Query against GET /healthz
vite.config.ts      # build + dev server (port 5173), Tailwind v4 plugin, path aliases
vitest.config.ts    # extends @carnotea/vitest-config with the jsdom environment
vitest.setup.ts     # registers @testing-library/jest-dom matchers
```

## Component locations

- **`src/components/ui/`** — shadcn/ui components only. Added via `pnpm dlx shadcn@latest add <name>`. Never hand-edit generated component internals; re-run the CLI instead.
- **`src/components/`** — layout and shared app-level components (e.g. `ThemeProvider`, `Navbar`, `PageWrapper`).
- **`src/features/<name>/`** — feature folders own their own components, plus their `routes.ts` and `queries.ts`. Keep everything for a feature co-located. `src/features/health/` is the reference example. New top-level `src/` directories must add their `@/` alias to `vite.config.ts`, `vitest.config.ts`, and `tsconfig.json` together.

## Path aliases

| Alias          | Maps to          |
| -------------- | ---------------- |
| `@/components` | `src/components` |
| `@/features`   | `src/features`   |
| `@/lib`        | `src/lib`        |
| `@/routes`     | `src/routes`     |

Configured in `vite.config.ts` (runtime), `vitest.config.ts` (tests), and `tsconfig.json` (type-checking). Only directories that exist are aliased — add a new alias in all three when you create its directory.

## Routing (TanStack Router — code-based)

We use **code-based** routing, not file-based. Routes are plain modules that
export a `createRoute(...)` value; `src/lib/router.ts` imports them, calls
`rootRoute.addChildren([...])`, and creates the router. Rationale: ADR-0005
explicitly chose "code-based routing with strong types", and code-based keeps the
toolchain minimal — no Vite router plugin, no generated `routeTree.gen.ts` to
bootstrap, commit, and keep in sync. The route tree is small and assembled
explicitly, so a new agent can read `src/lib/router.ts` and see every route at a
glance.

- App-level routes (the root layout and the index) live in `src/routes/`.
- **Feature routes live with their feature**: `src/features/<name>/routes.ts`
  exports the route(s), co-located with that feature's `queries.ts` and
  components. Register them in `src/lib/router.ts`.
- The root route is created with `createRootRouteWithContext<RouterContext>()`
  so `queryClient` is available to loaders via `context`. Warm the cache from a
  route `loader` with `context.queryClient.prefetchQuery(...)` (non-throwing, so
  a failed request still renders the component) and read with `useQuery` in the
  component, which owns the loading/error/success UI — see
  `src/features/health/`.

## Data / state (TanStack Query)

- **Server state lives in TanStack Query.** Component-local UI state lives in
  `useState`. Do not add Zustand, Redux, or any other global store unless a
  future ADR introduces one.
- The shared `QueryClient` is configured once in `src/lib/queryClient.ts`
  (`staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false`). Don't construct
  ad-hoc clients in app code.
- Each feature owns its `queries.ts`, exporting `queryOptions(...)` values that
  routes and components share. Validate every fetched response with **Zod** at
  the boundary. The example fetches the API with a same-origin relative path
  (`/healthz`); the Vite dev server proxies it to the API (`vite.config.ts` →
  `server.proxy`). The typesafe client and configurable base URL land in T-011.
- Router + Query devtools render only in development via `Devtools` and are
  tree-shaken out of the production bundle.

## Styling

- Tailwind v4 via `@tailwindcss/vite` plugin — no `tailwind.config.ts` or `postcss.config.cjs`.
- Theme tokens are CSS variables defined in `src/styles/globals.css` and mapped to
  Tailwind utilities via `@theme inline`.
- Dark mode is toggled by adding/removing the `dark` class on `<html>`. Use `useTheme()`
  from `ThemeProvider` to toggle.
- Icon library: `lucide-react` only. Do not add other icon packs.

## Rules

- tsconfig extends `@carnotea/tsconfig/react.json`; ESLint extends `react` from
  `@carnotea/eslint-config`. Don't fork these presets locally.
- Vite builds the bundle — there is no `tsc` emit. `typecheck` is `tsc --noEmit`;
  `build` is `vite build` (outputs to `dist/`).
- Never hard-code a user-facing string in JSX — route every label, including
  `aria-label`s and the `CarNotea` brand, through `t(...)`. The
  `react/jsx-no-literals` ESLint rule (scoped to `src/**/*.tsx`, tests exempt)
  fails the build on any untranslated JSX text. See **i18n** below.
- Prefer named exports. `main.tsx` is the one place a default-style framework
  entry lives; components export by name (`export function App()`).
- Tests run under Vitest + jsdom with Testing Library. Name them
  `*.test.tsx`/`*.test.ts` under `src/`. Query by role/label, not test ids.
- Verify UI changes in a real browser with `agent-browser` before ticking a UI
  acceptance criterion — see `docs/agents/self-review.md` §UI verification.

## i18n (ADR-0007)

The app is bilingual (`pl` + `en`) from the first screen via `i18next` +
`react-i18next`. Setup lives in `src/i18n/index.ts`.

- **Namespaces.** `common` holds shared strings (brand, language/theme labels);
  every feature folder owns one namespace named after the feature
  (`landing`, later `vehicles`, `fuel-logs`, …). Register a new namespace in
  `src/i18n/index.ts` (`ns` + `resources`) and add it to `i18next.d.ts`.
- **Files.** `src/locales/<lang>/<namespace>.json`, one file per
  namespace per language. **A key must exist in both `pl` and `en`** — `en` is
  the fallback and the type source (`i18next.d.ts`), so a key missing from `en`
  is a type error and a key missing from `pl` falls back to English.
- **Keys.** Nested objects, addressed with dot notation
  (`preview.today`); keep nesting ≤ 3 levels. Reference cross-namespace keys
  with the `namespace:key` prefix (`t('common:appName')`).
- **Usage.** `const { t } = useTranslation('landing')` (or an array of
  namespaces). Never hard-code JSX text — `react/jsx-no-literals` enforces it.
- **Switching language.** `LanguageSwitcher` calls `i18n.changeLanguage`; the
  browser-language detector persists the choice to `localStorage`
  (`carnotea.lang`) and restores it on next load.
- **Dates & numbers.** Format with the `Intl`-based helpers in `src/lib/format.ts`,
  passing the active locale (`i18n.resolvedLanguage`). Never format user-facing
  dates/numbers by hand.

## Out of scope here (own tickets)

The typesafe API client (T-011) and the PWA layer (T-012) are still separate
tickets. Don't pull them in ahead of their tickets. Routing and TanStack Query
landed in T-009, and i18n landed in T-010.
