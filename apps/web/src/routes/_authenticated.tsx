import { createRoute, redirect } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/app-shell';
import { SessionGate } from '@/features/auth/session-gate';
import { sessionQueryOptions } from '@/features/auth/use-session';
import { ActiveVehicleProvider } from '@/features/vehicles/active-vehicle-context';

import { rootRoute } from './root';

function AuthenticatedLayout() {
  return (
    <SessionGate>
      <ActiveVehicleProvider>
        <AppShell />
      </ActiveVehicleProvider>
    </SessionGate>
  );
}

export const authenticatedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  component: AuthenticatedLayout,
  beforeLoad: async ({ context, location }) => {
    await context.queryClient.prefetchQuery(sessionQueryOptions);

    const sessionState = context.queryClient.getQueryState(sessionQueryOptions.queryKey);
    const session = context.queryClient.getQueryData(sessionQueryOptions.queryKey);

    if (sessionState?.status === 'success' && !session?.user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router uses thrown redirects for loader navigation.
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
        replace: true,
      });
    }
  },
});
