# apps/web AGENTS.md

Area-specific rules for `@carnotea/web` — the Vite + React + TypeScript PWA.
These override the root `AGENTS.md` for any file under `apps/web/`.

## Structure

```
index.html        # Vite HTML entry — mounts #root
src/
  main.tsx        # bootstrap: createRoot + render <App/> (default React entry)
  App.tsx         # root component
  vite-env.d.ts   # Vite client ambient types
vite.config.ts    # build + dev server (port 5173)
vitest.config.ts  # extends @carnotea/vitest-config with the jsdom environment
vitest.setup.ts   # registers @testing-library/jest-dom matchers
```

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

Routing (T-009), Tailwind/shadcn (T-008), TanStack Query (T-009), i18n (T-010),
the typesafe API client (T-011), and the PWA layer (T-012). Don't pull them in
ahead of their tickets.
