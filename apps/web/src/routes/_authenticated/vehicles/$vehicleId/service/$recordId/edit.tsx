import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ServiceEditPage } from '@/features/service/components/service-form';

export function createServiceEditRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/service/$recordId/edit',
    component: ServiceEditPage,
  });
}