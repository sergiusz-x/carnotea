import { type FluidLogCreate, type FluidLogUpdate } from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiClient } from '@/lib/api/client';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const fluidLogKeys = {
  all: (vehicleId: string) => ['vehicles', vehicleId, 'fluid-logs'] as const,
  detail: (vehicleId: string, id: string) => ['vehicles', vehicleId, 'fluid-logs', id] as const,
};

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchFluidLogs(vehicleId: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/fluid-logs', { vehicleId });
  return data;
}

async function fetchFluidLog(vehicleId: string, id: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/fluid-logs/{id}', {
    vehicleId,
    id,
  });
  return data;
}

// ─── Query options ─────────────────────────────────────────────────────────────

export const fluidLogsQueryOptions = (vehicleId: string) =>
  queryOptions({
    queryKey: fluidLogKeys.all(vehicleId),
    queryFn: () => fetchFluidLogs(vehicleId),
  });

export const fluidLogQueryOptions = (vehicleId: string, id: string) =>
  queryOptions({
    queryKey: fluidLogKeys.detail(vehicleId, id),
    queryFn: () => fetchFluidLog(vehicleId, id),
  });

// ─── Mutations ─────────────────────────────────────────────────────────────────
// Note: unlike fuel/charging, fluid logs never touch mileage readings — the
// service deliberately doesn't sync a derived reading — so only the narrow
// fluid-logs + expenses keys are invalidated, not `invalidateMileageAndExpenses`.

export function useCreateFluidLog(vehicleId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: FluidLogCreate) =>
      apiClient.POST('/api/vehicles/{vehicleId}/fluid-logs', body, { vehicleId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fluidLogKeys.all(vehicleId) });
      await queryClient.invalidateQueries({ queryKey: ['vehicles', vehicleId, 'expenses'] });
      await navigate({ to: '/vehicles/$vehicleId/fluid-logs', params: { vehicleId } });
    },
  });
}

export function useUpdateFluidLog(vehicleId: string, logId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: FluidLogUpdate) =>
      apiClient.PATCH('/api/vehicles/{vehicleId}/fluid-logs/{id}', body, {
        vehicleId,
        id: logId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fluidLogKeys.detail(vehicleId, logId) });
      await queryClient.invalidateQueries({ queryKey: fluidLogKeys.all(vehicleId) });
      await queryClient.invalidateQueries({ queryKey: ['vehicles', vehicleId, 'expenses'] });
      await navigate({ to: '/vehicles/$vehicleId/fluid-logs', params: { vehicleId } });
    },
  });
}

export function useDeleteFluidLog(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.DELETE('/api/vehicles/{vehicleId}/fluid-logs/{id}', { vehicleId, id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: fluidLogKeys.all(vehicleId) });
      await queryClient.invalidateQueries({ queryKey: ['vehicles', vehicleId, 'expenses'] });
    },
  });
}
