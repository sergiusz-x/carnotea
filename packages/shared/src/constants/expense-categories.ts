export const EXPENSE_CATEGORY_CODES = [
  'fuel',
  'electricity',
  'service',
  'parts',
  'insurance',
  'inspection',
  'other',
] as const;

export type ExpenseCategoryCode = (typeof EXPENSE_CATEGORY_CODES)[number];
