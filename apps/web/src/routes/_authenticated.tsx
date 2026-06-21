import { createRoute, redirect } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/app-shell';
import { sessionQueryOptions } from '@/features/auth/use-session';

import { rootRoute } from './root';

export const authenticatedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_authenticated',
  component: AppShell,
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (!session?.user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
});
