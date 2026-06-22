import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ReminderCreatePage } from '@/features/reminders/components/reminder-form';

export function createReminderNewRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/reminders/new',
    component: ReminderCreatePage,
  });
}
