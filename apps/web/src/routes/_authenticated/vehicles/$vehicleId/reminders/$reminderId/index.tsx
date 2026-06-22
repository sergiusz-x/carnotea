import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';

import { ReminderDetailPage } from '@/features/reminders/components/reminder-detail';

export function createReminderDetailRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/reminders/$reminderId',
    component: ReminderDetailPage,
  });
}
