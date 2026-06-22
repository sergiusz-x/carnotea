import { type ExpenseCreate, type ExpenseUpdate } from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiClient } from '@/lib/api/client';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const expenseKeys = {
  all: (vehicleId: string) => ['vehicles', vehicleId, 'expenses'] as const,
  detail: (vehicleId: string, id: string) => ['vehicles', vehicleId, 'expenses', id] as const,
};

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchExpenses(vehicleId: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/expenses', { vehicleId });
  return data;
}

async function fetchExpense(vehicleId: string, id: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/expenses/{id}', {
    vehicleId,
    id,
  });
  return data;
}

// ─── Query options ─────────────────────────────────────────────────────────────

export const expensesQueryOptions = (vehicleId: string) =>
  queryOptions({
    queryKey: expenseKeys.all(vehicleId),
    queryFn: () => fetchExpenses(vehicleId),
  });

export const expenseQueryOptions = (vehicleId: string, id: string) =>
  queryOptions({
    queryKey: expenseKeys.detail(vehicleId, id),
    queryFn: () => fetchExpense(vehicleId, id),
  });

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateExpense(vehicleId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: ExpenseCreate) =>
      apiClient.POST('/api/vehicles/{vehicleId}/expenses', body, { vehicleId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.all(vehicleId),
      });
      await navigate({
        to: '/vehicles/$vehicleId/expenses',
        params: { vehicleId },
      });
    },
  });
}

export function useUpdateExpense(vehicleId: string, expenseId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: ExpenseUpdate) =>
      apiClient.PATCH('/api/vehicles/{vehicleId}/expenses/{id}', body, {
        vehicleId,
        id: expenseId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.detail(vehicleId, expenseId),
      });
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.all(vehicleId),
      });
      await navigate({
        to: '/vehicles/$vehicleId/expenses',
        params: { vehicleId },
      });
    },
  });
}

export function useDeleteExpense(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.DELETE('/api/vehicles/{vehicleId}/expenses/{id}', { vehicleId, id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.all(vehicleId),
      });
    },
  });
}
