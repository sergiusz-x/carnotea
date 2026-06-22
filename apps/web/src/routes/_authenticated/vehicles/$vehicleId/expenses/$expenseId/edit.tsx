import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ExpenseEditPage } from '@/features/expenses/components/expense-form';

export function createExpenseEditRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/expenses/$expenseId/edit',
    component: ExpenseEditPage,
  });
}