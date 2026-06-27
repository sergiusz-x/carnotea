import { useQuery } from '@tanstack/react-query';

import { mileageReadingsQueryOptions } from '@/features/vehicles/queries';

export function useLastMileage(vehicleId: string): number | undefined {
  const { data } = useQuery(mileageReadingsQueryOptions(vehicleId));
  if (!data?.length) return undefined;
  return Math.max(...data.map((r) => r.mileage));
}
