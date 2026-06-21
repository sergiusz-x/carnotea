import { describe, expect, it } from 'vitest';

import { computeDueState, DUE_SOON_DAYS, DUE_SOON_MILEAGE } from './due-state.js';

describe('computeDueState', () => {
  it('returns ok when no triggers are set', () => {
    expect(computeDueState({})).toBe('ok');
  });

  it('returns ok when status is done', () => {
    expect(
      computeDueState({
        dueDate: '2020-01-01',
        dueMileage: 1000,
        currentMileage: 2000,
        status: 'done',
      }),
    ).toBe('ok');
  });

  it('returns ok when status is cancelled', () => {
    expect(
      computeDueState({
        dueDate: '2020-01-01',
        status: 'cancelled',
      }),
    ).toBe('ok');
  });

  it('returns overdue when dueDate is in the past', () => {
    const pastDate = '2020-01-01';
    expect(computeDueState({ dueDate: pastDate, status: 'pending' })).toBe('overdue');
  });

  it('returns overdue when dueMileage is less than or equal to currentMileage', () => {
    expect(
      computeDueState({ dueMileage: 100000, currentMileage: 100000, status: 'pending' }),
    ).toBe('overdue');
    expect(
      computeDueState({ dueMileage: 100000, currentMileage: 110000, status: 'pending' }),
    ).toBe('overdue');
  });

  it('returns due_soon when dueDate is within the threshold', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + DUE_SOON_DAYS - 1);
    const dateStr = futureDate.toISOString().split('T')[0];
    expect(computeDueState({ dueDate: dateStr, status: 'pending' })).toBe('due_soon');
  });

  it('returns due_soon when dueMileage is within the threshold', () => {
    expect(
      computeDueState({
        dueMileage: 50500,
        currentMileage: 50000,
        status: 'pending',
      }),
    ).toBe('due_soon');
  });

  it('returns ok when dueDate is far in the future', () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 5);
    const dateStr = farFuture.toISOString().split('T')[0];
    expect(computeDueState({ dueDate: dateStr, status: 'pending' })).toBe('ok');
  });

  it('returns ok when dueMileage is far above currentMileage', () => {
    expect(
      computeDueState({
        dueMileage: 200000,
        currentMileage: 50000,
        status: 'pending',
      }),
    ).toBe('ok');
  });

  it('uses dueDate as primary trigger when both are set', () => {
    // dueDate overdue, but mileage is fine → overdue (stronger signal)
    expect(
      computeDueState({
        dueDate: '2020-01-01',
        dueMileage: 200000,
        currentMileage: 50000,
        status: 'pending',
      }),
    ).toBe('overdue');
  });
});