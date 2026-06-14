export const REMINDER_STATUS_CODES = ['pending', 'done', 'cancelled'] as const;

export type ReminderStatusCode = (typeof REMINDER_STATUS_CODES)[number];
