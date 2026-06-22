import { type ChargingSessionCreate, type ChargingSessionUpdate } from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiClient } from '@/lib/api/client';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const chargingKeys = {
  all: (vehicleId: string) => ['vehicles', vehicleId, 'charging'] as const,
  detail: (vehicleId: string, id: string) => ['vehicles', vehicleId, 'charging', id] as const,
};

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchChargingSessions(vehicleId: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/charging-sessions', {
    vehicleId,
  });
  return data;
}

async function fetchChargingSession(vehicleId: string, id: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/charging-sessions/{id}', {
    vehicleId,
    id,
  });
  return data;
}

// ─── Query options ─────────────────────────────────────────────────────────────

export const chargingSessionsQueryOptions = (vehicleId: string) =>
  queryOptions({
    queryKey: chargingKeys.all(vehicleId),
    queryFn: () => fetchChargingSessions(vehicleId),
  });

export const chargingSessionQueryOptions = (vehicleId: string, id: string) =>
  queryOptions({
    queryKey: chargingKeys.detail(vehicleId, id),
    queryFn: () => fetchChargingSession(vehicleId, id),
  });

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateChargingSession(vehicleId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: ChargingSessionCreate) =>
      apiClient.POST('/api/vehicles/{vehicleId}/charging-sessions', body, { vehicleId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chargingKeys.all(vehicleId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'mileage'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'expenses'],
      });
      await navigate({
        to: '/vehicles/$vehicleId/charging',
        params: { vehicleId },
      });
    },
  });
}

export function useUpdateChargingSession(vehicleId: string, sessionId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: ChargingSessionUpdate) =>
      apiClient.PATCH('/api/vehicles/{vehicleId}/charging-sessions/{id}', body, {
        vehicleId,
        id: sessionId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chargingKeys.detail(vehicleId, sessionId),
      });
      await queryClient.invalidateQueries({
        queryKey: chargingKeys.all(vehicleId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'mileage'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'expenses'],
      });
      await navigate({
        to: '/vehicles/$vehicleId/charging',
        params: { vehicleId },
      });
    },
  });
}

export function useDeleteChargingSession(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.DELETE('/api/vehicles/{vehicleId}/charging-sessions/{id}', { vehicleId, id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: chargingKeys.all(vehicleId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'mileage'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'expenses'],
      });
    },
  });
}
