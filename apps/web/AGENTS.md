# apps/web AGENTS.md

Area-specific rules for `@carnotea/web` — the Vite + React + TypeScript PWA.
These override the root `AGENTS.md` for any file under `apps/web/`.

## Structure

```
index.html          # Vite HTML entry — mounts #root
components.json     # shadcn/ui CLI configuration
src/
  main.tsx          # bootstrap: createRoot + ThemeProvider + <App/>
  App.tsx           # root component
  vite-env.d.ts     # Vite client ambient types
  styles/
    globals.css     # Tailwind v4 @import + shadcn CSS variable theme
  lib/
    utils.ts        # cn() helper (clsx + tailwind-merge)
  components/
    ThemeProvider.tsx   # dark/light toggle context, persists to localStorage
    ui/                 # shadcn/ui components copied here by the CLI
  features/           # feature folders own their own components (see below)
vite.config.ts      # build + dev server (port 5173), Tailwind v4 plugin, path aliases
vitest.config.ts    # extends @carnotea/vitest-config with the jsdom environment
vitest.setup.ts     # registers @testing-library/jest-dom matchers
```

## Component locations

- **`src/components/ui/`** — shadcn/ui components only. Added via `pnpm dlx shadcn@latest add <name>`. Never hand-edit generated component internals; re-run the CLI instead.
- **`src/components/`** — layout and shared app-level components (e.g. `ThemeProvider`, `Navbar`, `PageWrapper`).
- **`src/features/<name>/`** — feature folders own their own components. Keep component files co-located with the feature they belong to.

## Path aliases

| Alias | Maps to |
|-------|---------|
| `@/components` | `src/components` |
| `@/lib` | `src/lib` |
| `@/features` | `src/features` |

Configured in both `vite.config.ts` (runtime) and `tsconfig.json` (type-checking).

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
- Never hard-code a user-facing string in JSX. Route every label through i18n
  (i18next, T-010). The bare `CarNotea` brand placeholder is the one sanctioned
  exception until T-010 lands.
- Prefer named exports. `main.tsx` is the one place a default-style framework
  entry lives; components export by name (`export function App()`).
- Tests run under Vitest + jsdom with Testing Library. Name them
  `*.test.tsx`/`*.test.ts` under `src/`. Query by role/label, not test ids.
- Verify UI changes in a real browser with `agent-browser` before ticking a UI
  acceptance criterion — see `docs/agents/self-review.md` §UI verification.

## Out of scope here (own tickets)

Routing (T-009), TanStack Query (T-009), i18n (T-010),
the typesafe API client (T-011), and the PWA layer (T-012). Don't pull them in
ahead of their tickets.
