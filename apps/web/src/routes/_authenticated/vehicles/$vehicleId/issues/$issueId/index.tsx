import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { IssueDetailPage } from '@/features/issues/components/issue-detail';

export function createIssueDetailRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/issues/$issueId',
    component: IssueDetailPage,
  });
}
