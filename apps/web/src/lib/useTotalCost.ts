import { useWatch } from 'react-hook-form';

import type { useZodForm } from '@/components/form';

export function useTotalCost(
  form: ReturnType<typeof useZodForm>,
  fieldA: string,
  fieldB: string,
): string | null {
  const a = useWatch({ control: form.control, name: fieldA }) as number | undefined;
  const b = useWatch({ control: form.control, name: fieldB }) as number | undefined;
  const parsedA = Number(a);
  const parsedB = Number(b);
  return !Number.isNaN(parsedA) && !Number.isNaN(parsedB) && parsedA > 0 && parsedB > 0
    ? (parsedA * parsedB).toFixed(2)
    : null;
}
