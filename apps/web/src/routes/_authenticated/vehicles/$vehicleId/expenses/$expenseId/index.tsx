import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ExpenseDetailPage } from '@/features/expenses/components/expense-detail';

export function createExpenseDetailRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/expenses/$expenseId',
    component: ExpenseDetailPage,
  });
}
