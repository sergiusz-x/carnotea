import { type ServiceRecordCreate, type ServiceRecordUpdate } from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiClient } from '@/lib/api/client';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const serviceKeys = {
  all: (vehicleId: string) => ['vehicles', vehicleId, 'service-records'] as const,
  detail: (vehicleId: string, id: string) =>
    ['vehicles', vehicleId, 'service-records', id] as const,
};

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchServiceRecords(vehicleId: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/service-records', { vehicleId });
  return data;
}

async function fetchServiceRecord(vehicleId: string, id: string) {
  const { data } = await apiClient.GET(
    '/api/vehicles/{vehicleId}/service-records/{id}',
    { vehicleId, id },
  );
  return data;
}

// ─── Query options ─────────────────────────────────────────────────────────────

export const serviceRecordsQueryOptions = (vehicleId: string) =>
  queryOptions({
    queryKey: serviceKeys.all(vehicleId),
    queryFn: () => fetchServiceRecords(vehicleId),
  });

export const serviceRecordQueryOptions = (vehicleId: string, id: string) =>
  queryOptions({
    queryKey: serviceKeys.detail(vehicleId, id),
    queryFn: () => fetchServiceRecord(vehicleId, id),
  });

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateServiceRecord(vehicleId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: ServiceRecordCreate) =>
      apiClient.POST('/api/vehicles/{vehicleId}/service-records', body, { vehicleId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: serviceKeys.all(vehicleId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'mileage'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'expenses'],
      });
      await navigate({
        to: '/vehicles/$vehicleId/service',
        params: { vehicleId },
      });
    },
  });
}

export function useUpdateServiceRecord(vehicleId: string, recordId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: ServiceRecordUpdate) =>
      apiClient.PATCH('/api/vehicles/{vehicleId}/service-records/{id}', body, {
        vehicleId,
        id: recordId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(vehicleId, recordId),
      });
      await queryClient.invalidateQueries({
        queryKey: serviceKeys.all(vehicleId),
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'mileage'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicles', vehicleId, 'expenses'],
      });
      await navigate({
        to: '/vehicles/$vehicleId/service',
        params: { vehicleId },
      });
    },
  });
}

export function useDeleteServiceRecord(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.DELETE('/api/vehicles/{vehicleId}/service-records/{id}', { vehicleId, id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: serviceKeys.all(vehicleId),
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