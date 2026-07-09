import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { FluidLogListPage } from '@/features/fluid-logs/components/fluid-log-list';

export function createFluidLogListRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/fluid-logs',
    component: FluidLogListPage,
  });
}
