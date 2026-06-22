export const ISSUE_PRIORITY_CODES = ['low', 'medium', 'high', 'critical'] as const;

export type IssuePriorityCode = (typeof ISSUE_PRIORITY_CODES)[number];
