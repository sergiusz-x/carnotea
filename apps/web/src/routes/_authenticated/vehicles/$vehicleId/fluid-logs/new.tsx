import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { FluidLogCreatePage } from '@/features/fluid-logs/components/fluid-log-form';

export function createFluidLogNewRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/fluid-logs/new',
    component: FluidLogCreatePage,
  });
}
