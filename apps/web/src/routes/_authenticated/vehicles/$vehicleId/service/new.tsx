import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ServiceCreatePage } from '@/features/service/components/service-form';

export function createServiceNewRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/service/new',
    component: ServiceCreatePage,
  });
}