import { type VehicleCreate, type VehicleUpdate } from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiClient } from '@/lib/api/client';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const vehicleKeys = {
  all: () => ['vehicles'] as const,
  detail: (id: string) => ['vehicles', id] as const,
  mileage: (id: string) => ['vehicles', id, 'mileage'] as const,
};

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchVehicles() {
  const { data } = await apiClient.GET('/api/vehicles');
  return data;
}

async function fetchVehicle(id: string) {
  const { data } = await apiClient.GET('/api/vehicles/{id}', { id });
  return data;
}

async function fetchMileageReadings(vehicleId: string) {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/mileage-readings', { vehicleId });
  return data;
}

// ─── Query options ─────────────────────────────────────────────────────────────

export const vehiclesQueryOptions = queryOptions({
  queryKey: vehicleKeys.all(),
  queryFn: fetchVehicles,
});

export const vehicleQueryOptions = (id: string) =>
  queryOptions({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => fetchVehicle(id),
  });

export const mileageReadingsQueryOptions = (vehicleId: string) =>
  queryOptions({
    queryKey: vehicleKeys.mileage(vehicleId),
    queryFn: () => fetchMileageReadings(vehicleId),
  });

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: VehicleCreate) => apiClient.POST('/api/vehicles', body),
    onSuccess: async ({ data }) => {
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.all() });
      await navigate({ to: '/vehicles/$vehicleId', params: { vehicleId: data.id } });
    },
  });
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: VehicleUpdate) => apiClient.PATCH('/api/vehicles/{id}', body, { id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(id) });
      await navigate({ to: '/vehicles/$vehicleId', params: { vehicleId: id } });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (id: string) => apiClient.DELETE('/api/vehicles/{id}', { id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.all() });
      await navigate({ to: '/vehicles' });
    },
  });
}

export function useAddMileageReading(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { readingDate: string; mileage: number; note?: string | null }) =>
      apiClient.POST('/api/vehicles/{vehicleId}/mileage-readings', body, { vehicleId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.mileage(vehicleId) });
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(vehicleId) });
    },
  });
}
