import { useQuery } from '@tanstack/react-query';

import { mileageReadingsQueryOptions, vehicleQueryOptions } from '@/features/vehicles/queries';
import { resolveLatestMileage } from '@/features/vehicles/vehicle-usage';

export function useLastMileage(vehicleId: string): number | undefined {
  const { data: vehicle } = useQuery({
    ...vehicleQueryOptions(vehicleId),
    enabled: Boolean(vehicleId),
  });
  const { data: readings } = useQuery({
    ...mileageReadingsQueryOptions(vehicleId),
    enabled: Boolean(vehicleId),
  });

  return resolveLatestMileage(vehicle?.currentMileage, readings);
}
