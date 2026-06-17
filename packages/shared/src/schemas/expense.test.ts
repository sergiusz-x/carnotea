import { describe, expect, it } from 'vitest';

import { ExpenseCreateSchema } from './expense.js';

describe('ExpenseCreateSchema', () => {
  it('accepts a valid manual expense and omits source fields', () => {
    const parsed = ExpenseCreateSchema.parse({
      category: 'insurance',
      expenseDate: '2026-01-15',
      amount: '450.00',
      description: 'Annual policy',
    });
    expect(parsed.amount).toBeCloseTo(450);
    expect('sourceType' in parsed).toBe(false);
  });

  it('rejects an unknown category', () => {
    expect(() =>
      ExpenseCreateSchema.parse({ category: 'bribes', expenseDate: '2026-01-15', amount: 10 }),
    ).toThrow();
  });

  it('rejects a negative amount', () => {
    expect(() =>
      ExpenseCreateSchema.parse({ category: 'other', expenseDate: '2026-01-15', amount: -1 }),
    ).toThrow();
  });
});
