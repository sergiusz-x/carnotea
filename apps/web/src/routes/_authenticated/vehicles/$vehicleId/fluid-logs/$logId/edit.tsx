import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { FluidLogEditPage } from '@/features/fluid-logs/components/fluid-log-form';

export function createFluidLogEditRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/fluid-logs/$logId/edit',
    component: FluidLogEditPage,
  });
}
