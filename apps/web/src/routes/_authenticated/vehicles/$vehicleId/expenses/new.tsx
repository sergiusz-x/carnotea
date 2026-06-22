import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ExpenseCreatePage } from '@/features/expenses/components/expense-form';

export function createExpenseNewRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/expenses/new',
    component: ExpenseCreatePage,
  });
}
