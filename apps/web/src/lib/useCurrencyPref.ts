import { useQuery } from '@tanstack/react-query';

import { profileQueryOptions } from '@/features/profile/queries';

export function useCurrencyPref(): string {
  const { data } = useQuery(profileQueryOptions);
  return data?.currencyPref ?? 'EUR';
}
