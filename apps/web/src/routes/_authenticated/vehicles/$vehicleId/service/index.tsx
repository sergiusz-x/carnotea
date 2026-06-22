import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ServiceListPage } from '@/features/service/components/service-list';

export function createServiceListRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/service',
    component: ServiceListPage,
  });
}