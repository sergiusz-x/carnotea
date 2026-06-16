import { z } from 'zod';

export const ApiIssueSchema = z.object({
  code: z.string(),
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
});

export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  issues: z.array(ApiIssueSchema).optional(),
});

export type ApiIssue = z.infer<typeof ApiIssueSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
