import { type FuelLogCreate, type FuelLogUpdate } from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiClient } from '@/lib/api/client';
import { invalidateMileageAndExpenses } from '@/lib/query/invalidate';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const fuelLogKeys = {
  all: (vehicleId: string) => ['vehicles', vehicleId, 'fuel-logs'] as const,
  detail: (vehicleId: string, id: string) => ['vehicles', vehicleId, 'fuel-logs', id] as const,
};

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchFuelLogs(vehicleId: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/fuel-logs', { vehicleId });
  return data;
}

async function fetchFuelLog(vehicleId: string, id: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/fuel-logs/{id}', {
    vehicleId,
    id,
  });
  return data;
}

// ─── Query options ─────────────────────────────────────────────────────────────

export const fuelLogsQueryOptions = (vehicleId: string) =>
  queryOptions({
    queryKey: fuelLogKeys.all(vehicleId),
    queryFn: () => fetchFuelLogs(vehicleId),
  });

export const fuelLogQueryOptions = (vehicleId: string, id: string) =>
  queryOptions({
    queryKey: fuelLogKeys.detail(vehicleId, id),
    queryFn: () => fetchFuelLog(vehicleId, id),
  });

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateFuelLog(vehicleId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: FuelLogCreate) =>
      apiClient.POST('/api/vehicles/{vehicleId}/fuel-logs', body, { vehicleId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fuelLogKeys.all(vehicleId) });
      await invalidateMileageAndExpenses(queryClient, vehicleId);
      await navigate({ to: '/vehicles/$vehicleId/fuel', params: { vehicleId } });
    },
  });
}

export function useUpdateFuelLog(vehicleId: string, fuelId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: FuelLogUpdate) =>
      apiClient.PATCH('/api/vehicles/{vehicleId}/fuel-logs/{id}', body, { vehicleId, id: fuelId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fuelLogKeys.detail(vehicleId, fuelId) });
      await queryClient.invalidateQueries({ queryKey: fuelLogKeys.all(vehicleId) });
      await invalidateMileageAndExpenses(queryClient, vehicleId);
      await navigate({ to: '/vehicles/$vehicleId/fuel', params: { vehicleId } });
    },
  });
}

export function useDeleteFuelLog(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.DELETE('/api/vehicles/{vehicleId}/fuel-logs/{id}', { vehicleId, id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fuelLogKeys.all(vehicleId) });
      await invalidateMileageAndExpenses(queryClient, vehicleId);
    },
  });
}
