import type { QueryClient } from '@tanstack/react-query';

export async function invalidateMileageAndExpenses(
  queryClient: QueryClient,
  vehicleId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['vehicles', vehicleId, 'mileage'] }),
    queryClient.invalidateQueries({ queryKey: ['vehicles', vehicleId, 'expenses'] }),
  ]);
}
