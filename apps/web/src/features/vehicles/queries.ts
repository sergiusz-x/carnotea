import { type Vehicle, type VehicleCreate, type VehicleUpdate } from '@carnotea/shared';
import { useMutation, useQueryClient, queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { apiClient } from '@/lib/api/client';

export const vehicleKeys = {
  all: () => ['vehicles'] as const,
  detail: (id: string) => ['vehicles', id] as const,
  mileage: (id: string) => ['vehicles', id, 'mileage'] as const,
};

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

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: VehicleCreate) => apiClient.POST('/api/vehicles', body),
    onSuccess: async ({ data }) => {
      queryClient.setQueryData<Vehicle[]>(vehicleKeys.all(), (current) =>
        current ? [data, ...current.filter((vehicle) => vehicle.id !== data.id)] : [data],
      );
      queryClient.setQueryData(vehicleKeys.detail(data.id), data);
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
    onSuccess: async ({ data }) => {
      queryClient.setQueryData(vehicleKeys.detail(id), data);
      queryClient.setQueryData<Vehicle[]>(vehicleKeys.all(), (current) =>
        current?.map((vehicle) => (vehicle.id === id ? data : vehicle)),
      );
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.all() });
      await navigate({ to: '/vehicles/$vehicleId', params: { vehicleId: id } });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (id: string) => apiClient.DELETE('/api/vehicles/{id}', { id }),
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: vehicleKeys.detail(id) });
      queryClient.setQueryData<Vehicle[]>(vehicleKeys.all(), (current) =>
        current?.filter((vehicle) => vehicle.id !== id),
      );
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.all() });
      await navigate({ to: '/vehicles', replace: true });
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

export function useDeleteMileageReading(vehicleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.DELETE('/api/vehicles/{vehicleId}/mileage-readings/{id}', { vehicleId, id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.mileage(vehicleId) });
      await queryClient.invalidateQueries({ queryKey: vehicleKeys.detail(vehicleId) });
    },
  });
}
