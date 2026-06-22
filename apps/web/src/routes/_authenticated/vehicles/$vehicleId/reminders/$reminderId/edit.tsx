import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ReminderEditPage } from '@/features/reminders/components/reminder-form';

export function createReminderEditRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/reminders/$reminderId/edit',
    component: ReminderEditPage,
  });
}
