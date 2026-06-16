import { lazy, Suspense } from 'react';

// Dev-only. The PROD branch is a no-op, so the devtools packages are
// dropped from the production bundle by tree-shaking.
const RouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    );

const QueryDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    );

export function Devtools() {
  return (
    <Suspense>
      <RouterDevtools />
      <QueryDevtools />
    </Suspense>
  );
}
