import {
  type IssueCreate,
  type IssueUpdate,
  ISSUE_STATUS_CODES,
  type IssueStatusCode,
} from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiClient } from '@/lib/api/client';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const issueKeys = {
  all: (vehicleId: string) => ['vehicles', vehicleId, 'issues'] as const,
  filtered: (vehicleId: string, status?: string) =>
    ['vehicles', vehicleId, 'issues', { status }] as const,
  detail: (vehicleId: string, id: string) => ['vehicles', vehicleId, 'issues', id] as const,
};

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchIssues(vehicleId: string, status?: string) {
  const searchParams =
    status && status !== 'all' && ISSUE_STATUS_CODES.includes(status as IssueStatusCode)
      ? `?status=${encodeURIComponent(status)}`
      : '';

  const { data } = await apiClient.GET(
    `/api/vehicles/{vehicleId}/issues${searchParams}` as '/api/vehicles/{vehicleId}/issues',
    { vehicleId },
  );
  return data;
}

async function fetchIssue(vehicleId: string, id: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/issues/{id}', { vehicleId, id });
  return data;
}

// ─── Query options ─────────────────────────────────────────────────────────────

export const issuesQueryOptions = (vehicleId: string, status?: string) =>
  queryOptions({
    queryKey: issueKeys.filtered(vehicleId, status),
    queryFn: () => fetchIssues(vehicleId, status),
  });

export const issueQueryOptions = (vehicleId: string, id: string) =>
  queryOptions({
    queryKey: issueKeys.detail(vehicleId, id),
    queryFn: () => fetchIssue(vehicleId, id),
  });

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateIssue(vehicleId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: IssueCreate) =>
      apiClient.POST('/api/vehicles/{vehicleId}/issues', body, { vehicleId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: issueKeys.all(vehicleId),
      });
      await navigate({
        to: '/vehicles/$vehicleId/issues',
        params: { vehicleId },
      });
    },
  });
}

export function useUpdateIssue(vehicleId: string, issueId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: IssueUpdate) =>
      apiClient.PATCH('/api/vehicles/{vehicleId}/issues/{id}', body, {
        vehicleId,
        id: issueId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: issueKeys.detail(vehicleId, issueId),
      });
      await queryClient.invalidateQueries({
        queryKey: issueKeys.all(vehicleId),
      });
      await navigate({
        to: '/vehicles/$vehicleId/issues',
        params: { vehicleId },
      });
    },
  });
}

export function useDeleteIssue(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.DELETE('/api/vehicles/{vehicleId}/issues/{id}', { vehicleId, id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: issueKeys.all(vehicleId),
      });
    },
  });
}
