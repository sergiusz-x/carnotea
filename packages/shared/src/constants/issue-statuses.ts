export const ISSUE_STATUS_CODES = ['open', 'in_progress', 'resolved', 'cancelled'] as const;

export type IssueStatusCode = (typeof ISSUE_STATUS_CODES)[number];
