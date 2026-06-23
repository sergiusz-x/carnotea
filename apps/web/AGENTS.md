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
    auth-client.ts  # better-auth browser client (default baseURL + basePath /api/auth)
    router.ts       # assembles the route tree + creates the TanStack Router
    api/
      client.ts     # typed fetch client + normalized ApiError
      schema.d.ts   # committed generated types from GET /openapi.json
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
    layout/            # app-level layout: AppShell, Nav, UserMenu
  routes/             # app-level routes; see Routing below
    root.tsx          # root route + layout (Outlet + Devtools)
    _authenticated.tsx # pathless layout route — auth guard → AppShell
    _authenticated/    # child routes (/, /vehicles, /dashboard, /profile)
    login.tsx          # /login — sign-in/sign-up, redirects if already authed
    index.tsx         # index route '/' → <App/>
  features/           # feature folders own their own routes.ts + queries.ts + components
    health/           # example feature wiring Router + Query against GET /healthz
    auth/             # session query, sign-in/up/out forms, useSession hook
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
  routes and components share. Use `apiClient` from `src/lib/api/client.ts` for
  API requests; its request and response types come from the committed OpenAPI
  schema and it normalizes non-2xx responses to `ApiError`.
- After changing an API route contract, start the API and run
  `pnpm --filter @carnotea/web codegen:api`. Commit the resulting
  `src/lib/api/schema.d.ts`. Run `codegen:api:check` to reproduce the CI
  freshness check.
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

## Forms (T-031)

The shared forms layer lives in `src/components/form/` and `src/lib/forms/`.

### Usage pattern

```tsx
import { AppForm, FormSubmit, TextField, useZodForm } from '@/components/form';
import { MySchema } from '@carnotea/shared';

function MyForm() {
  const form = useZodForm(MySchema);
  return (
    <AppForm
      form={form}
      onSubmit={(values) => {
        /* typed values */
      }}
    >
      <TextField name="fieldName" label={t('label')} />
      <FormSubmit>{t('save')}</FormSubmit>
    </AppForm>
  );
}
```

### What lives where

| File                                       | Purpose                                           |
| ------------------------------------------ | ------------------------------------------------- |
| `src/components/form/Form.tsx`             | `useZodForm`, `AppForm`, `FormSubmit`             |
| `src/components/form/TextField.tsx`        | Text/email/tel/password input                     |
| `src/components/form/NumberField.tsx`      | Numeric input, parses to `number`                 |
| `src/components/form/DateField.tsx`        | `<input type="date">`                             |
| `src/components/form/SelectField.tsx`      | Native `<select>` from `{ value, label }[]`       |
| `src/components/form/set-server-errors.ts` | Maps API `ErrorResponse` back to fields           |
| `src/lib/forms/zod-i18n.ts`                | Zod 4 `customError` → `forms.*` i18n keys         |
| `src/components/ui/form.tsx`               | shadcn/ui form primitives (Context + aria wiring) |
| `src/components/ui/label.tsx`              | shadcn/ui label (wraps `@radix-ui/react-label`)   |
| `src/components/ui/input.tsx`              | shadcn/ui input (forwardRef, Tailwind classes)    |

### Rules

- All form strings (labels, placeholder, error messages) go through `t(...)` — never hard-code in field components.
- The `forms` namespace holds validation/submit strings; feature namespaces hold field labels.
- `useZodForm` is the only way to create a form. Never call `useForm` directly — it bypasses the Zod resolver.
- Use `setServerErrors` to map API error responses onto fields; never write field-level catch blocks by hand.
- Native `<select>` for `SelectField` is intentional (sufficient for current needs); upgrade to Radix Select only when multi-select or combobox is required.
- `useFormState()` (not `useFormContext()`) must be used anywhere you need reactive `errors` or `isSubmitting`, because `useFormContext` doesn't subscribe.
- Zod 4 error map is configured in `src/lib/forms/zod-i18n.ts` via `z.config({ customError: fn })`. Do not call `z.setErrorMap()` (removed in Zod 4).

## Out of scope here (own tickets)

The PWA layer (T-012) is a separate ticket. Don't pull it in ahead of its
ticket. Routing and TanStack Query landed in T-009, i18n landed in T-010, and
the typesafe API client landed in T-011.

## PWA (T-012)

The installable PWA baseline landed in T-012:

- `apps/web/public/manifest.webmanifest` — hand-authored; do not let vite-plugin-pwa overwrite it (manifest is set to `false` in `VitePWA()`).
- `apps/web/public/icons/` — placeholder icons. Replace with brand assets when the design decision is made.
- Service worker is registered by `vite-plugin-pwa` (`registerType: 'autoUpdate'`, `workbox: { runtimeCaching: [] }`).

**Do not add offline caching, background sync, or push notifications in this ticket — those live behind their own ADRs and tickets (see T-054, T-055).**

## Observability (T-018)

OpenTelemetry web tracing is initialised in `src/otel.ts` and imported as the
very first line of `main.tsx`. This ensures fetch / XHR instrumentation is in
place before any application code runs.

- **SDK:** `@opentelemetry/sdk-trace-web` with `getWebAutoInstrumentations`
  (document-load, fetch, XHR).
- **Trace propagation:** the `W3CTraceContextPropagator` automatically adds
  `traceparent` and `tracestate` headers to every fetch / XHR request to the
  API. The API already allows these headers in CORS (T-049).
- **Default-off:** when `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` is not set the
  entire `if` block compiles to a dead branch that Vite eliminates from the
  production bundle — zero cost when disabled.
- **Exporter:** OTLP HTTP exporter via `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`.

See [ADR-0013](../../docs/adr/0013-opentelemetry-observability.md).
