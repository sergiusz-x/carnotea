import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ExpenseListPage } from '@/features/expenses/components/expense-list';

export function createExpenseListRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/expenses',
    component: ExpenseListPage,
  });
}
