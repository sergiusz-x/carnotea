import { describe, expect, it } from 'vitest';

import { IssueCreateSchema } from './issue.js';

describe('IssueCreateSchema', () => {
  it('accepts a valid issue', () => {
    const parsed = IssueCreateSchema.parse({
      reportedDate: '2026-06-01',
      resolvedDate: '2026-06-10',
      title: 'Brake squeal',
      status: 'resolved',
      priority: 'medium',
    });
    expect(parsed.status).toBe('resolved');
  });

  it('rejects a resolved date before the reported date', () => {
    expect(() =>
      IssueCreateSchema.parse({
        reportedDate: '2026-06-10',
        resolvedDate: '2026-06-01',
        title: 'Brake squeal',
        status: 'resolved',
        priority: 'medium',
      }),
    ).toThrow();
  });

  it('rejects an unknown priority', () => {
    expect(() =>
      IssueCreateSchema.parse({
        reportedDate: '2026-06-01',
        title: 'x',
        status: 'open',
        priority: 'urgent',
      }),
    ).toThrow();
  });
});
