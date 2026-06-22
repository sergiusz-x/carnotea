import type { AnyRoute } from '@tanstack/react-router';
import { createRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { ReminderListPage } from '@/features/reminders/components/reminder-list';

const remindersSearchSchema = z.object({
  status: z.string().optional(),
});

export function createReminderListRoute(parentRoute: AnyRoute) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/reminders',
    component: ReminderListPage,
    validateSearch: remindersSearchSchema,
  });
}
