import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { IssueCreatePage } from '@/features/issues/components/issue-form';

export function createIssueNewRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/issues/new',
    component: IssueCreatePage,
  });
}
