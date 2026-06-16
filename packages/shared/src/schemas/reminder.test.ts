import { describe, expect, it } from 'vitest';

import { ReminderCreateSchema } from './reminder.js';

describe('ReminderCreateSchema', () => {
  it('accepts a reminder with a due date', () => {
    const parsed = ReminderCreateSchema.parse({
      title: 'Insurance renewal',
      dueDate: '2026-12-01',
      status: 'pending',
    });
    expect(parsed.status).toBe('pending');
  });

  it('accepts a reminder with only a due mileage', () => {
    const parsed = ReminderCreateSchema.parse({
      title: 'Timing belt',
      dueMileage: 150000,
      status: 'pending',
    });
    expect(parsed.dueMileage).toBe(150000);
  });

  it('rejects a reminder with no trigger', () => {
    expect(() => ReminderCreateSchema.parse({ title: 'Nothing', status: 'pending' })).toThrow();
  });
});
