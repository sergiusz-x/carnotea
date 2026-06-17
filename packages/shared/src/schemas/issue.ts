import { z } from 'zod';

import { ISSUE_PRIORITY_CODES } from '../constants/issue-priorities.js';
import { ISSUE_STATUS_CODES } from '../constants/issue-statuses.js';

import { dateField, timestampField, uuidField } from './_shared.js';

/**
 * Vehicle issue. The DB stores `statusId`/`priorityId` (FKs to lookups); the
 * contract exposes the stable `status`/`priority` codes. When set, `resolvedDate`
 * must be on or after `reportedDate` (DB check).
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

const resolvedDateRefine = (value: {
  reportedDate?: string;
  resolvedDate?: string | null;
}): boolean =>
  value.resolvedDate == null ||
  value.reportedDate == null ||
  value.resolvedDate >= value.reportedDate;

const resolvedDateError = {
  message: 'resolvedDate must be on or after reportedDate',
  path: ['resolvedDate'],
};

export const IssueSchema = issueFields.refine(resolvedDateRefine, resolvedDateError);

const issueCreateFields = issueFields.omit({
  id: true,
  vehicleId: true,
  createdAt: true,
  updatedAt: true,
});

export const IssueCreateSchema = issueCreateFields.refine(resolvedDateRefine, resolvedDateError);

export const IssueUpdateSchema = issueCreateFields
  .partial()
  .refine(resolvedDateRefine, resolvedDateError);

export type Issue = z.infer<typeof IssueSchema>;
export type IssueCreate = z.infer<typeof IssueCreateSchema>;
export type IssueUpdate = z.infer<typeof IssueUpdateSchema>;
