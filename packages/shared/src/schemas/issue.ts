import { z } from 'zod';

import { ISSUE_PRIORITY_CODES } from '../constants/issue-priorities.js';
import { ISSUE_STATUS_CODES } from '../constants/issue-statuses.js';

import { dateField, timestampField, uuidField } from './_shared.js';

/**
 * Vehicle issue. The DB stores `statusId`/`priorityId` (FKs to lookups); the
 * contract exposes the stable `status`/`priority` codes. When set, `resolvedDate`
 * must be on or after `reportedDate` (DB check). The resolved-date invariant:
 * - `status='resolved'` => `resolvedDate` is required
 * - Any other status => `resolvedDate` must be null
 * - `resolvedDate >= reportedDate`
 */
const issueFields = z.object({
  id: uuidField(),
  vehicleId: uuidField(),
  reportedDate: dateField(),
  resolvedDate: dateField().nullish(),
  title: z.string().min(1).max(160),
  description: z.string().nullish(),
  status: z.enum(ISSUE_STATUS_CODES),
  priority: z.enum(ISSUE_PRIORITY_CODES),
  relatedServiceRecordId: uuidField().nullish(),
  createdAt: timestampField(),
  updatedAt: timestampField(),
});

export const IssueSchema = issueFields.superRefine((value, ctx) => {
  if (value.resolvedDate != null && value.resolvedDate < value.reportedDate) {
    ctx.addIssue({
      code: 'custom',
      message: 'resolvedDate must be on or after reportedDate',
      path: ['resolvedDate'],
    });
  }
});

const issueCreateFields = issueFields.omit({
  id: true,
  vehicleId: true,
  createdAt: true,
  updatedAt: true,
});

export const IssueCreateSchema = issueCreateFields.superRefine((value, ctx) => {
  if (value.status === 'resolved' && (value.resolvedDate == null || value.resolvedDate === '')) {
    ctx.addIssue({
      code: 'custom',
      message: 'resolvedDate is required when status is resolved',
      path: ['resolvedDate'],
    });
  }
  if (value.status !== 'resolved' && value.resolvedDate != null && value.resolvedDate !== '') {
    ctx.addIssue({
      code: 'custom',
      message: 'resolvedDate must be null when status is not resolved',
      path: ['resolvedDate'],
    });
  }
  if (
    value.resolvedDate != null &&
    value.resolvedDate !== '' &&
    value.resolvedDate < value.reportedDate
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'resolvedDate must be on or after reportedDate',
      path: ['resolvedDate'],
    });
  }
});

export const IssueUpdateSchema = issueCreateFields.partial().superRefine((value, ctx) => {
  if (value.status === 'resolved' && (value.resolvedDate == null || value.resolvedDate === '')) {
    ctx.addIssue({
      code: 'custom',
      message: 'resolvedDate is required when status is resolved',
      path: ['resolvedDate'],
    });
  }
  if (value.status !== 'resolved' && value.resolvedDate != null && value.resolvedDate !== '') {
    ctx.addIssue({
      code: 'custom',
      message: 'resolvedDate must be null when status is not resolved',
      path: ['resolvedDate'],
    });
  }
  if (
    value.resolvedDate != null &&
    value.resolvedDate !== '' &&
    value.reportedDate != null &&
    value.resolvedDate < value.reportedDate
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'resolvedDate must be on or after reportedDate',
      path: ['resolvedDate'],
    });
  }
});

export type Issue = z.infer<typeof IssueSchema>;
export type IssueCreate = z.infer<typeof IssueCreateSchema>;
export type IssueUpdate = z.infer<typeof IssueUpdateSchema>;
