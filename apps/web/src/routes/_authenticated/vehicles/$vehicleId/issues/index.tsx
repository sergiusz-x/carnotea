import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { IssueListPage } from '@/features/issues/components/issue-list';

const issuesSearchSchema = z.object({
  status: z.string().optional(),
});

export function createIssueListRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/issues',
    component: IssueListPage,
    validateSearch: issuesSearchSchema,
  });
}
