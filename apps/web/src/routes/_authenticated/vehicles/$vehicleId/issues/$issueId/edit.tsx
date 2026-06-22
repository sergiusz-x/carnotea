import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { IssueEditPage } from '@/features/issues/components/issue-form';

export function createIssueEditRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/issues/$issueId/edit',
    component: IssueEditPage,
  });
}
