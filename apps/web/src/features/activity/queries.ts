import {
  ActivityFeedResponseSchema,
  VehiclePanelSchema,
  type ActivityEntry,
  type VehiclePanel,
} from '@carnotea/shared';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export const activityKeys = {
  panel: (vehicleId: string) => ['vehicle-panel', vehicleId] as const,
  feed: (vehicleId: string) => ['activity', vehicleId] as const,
};

async function fetchVehiclePanel(vehicleId: string): Promise<VehiclePanel> {
  const { data } = await apiClient.GET('/api/vehicles/{vehicleId}/panel', { vehicleId });
  return VehiclePanelSchema.parse(data);
}

async function fetchActivityPage(vehicleId: string, cursor?: string | null) {
  const { data } = await apiClient.GET(
    '/api/vehicles/{vehicleId}/activity',
    { vehicleId },
    { limit: 30, cursor },
  );
  return ActivityFeedResponseSchema.parse(data);
}

export type VehiclePanelData = Awaited<ReturnType<typeof fetchVehiclePanel>>;
export type ActivityFeedPage = Awaited<ReturnType<typeof fetchActivityPage>>;
export type ActivityFeedEntry = ActivityEntry;

export const vehiclePanelQueryOptions = (vehicleId: string) =>
  queryOptions({
    queryKey: activityKeys.panel(vehicleId),
    queryFn: () => fetchVehiclePanel(vehicleId),
  });

export const activityFeedInfiniteQueryOptions = (vehicleId: string) =>
  infiniteQueryOptions({
    queryKey: activityKeys.feed(vehicleId),
    queryFn: ({ pageParam }: { pageParam?: string | null }) =>
      fetchActivityPage(vehicleId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
