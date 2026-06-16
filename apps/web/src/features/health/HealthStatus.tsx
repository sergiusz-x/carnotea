import { useQuery } from '@tanstack/react-query';

import { healthQueryOptions } from './queries';

export function HealthStatus() {
  const { data, isPending, isError } = useQuery(healthQueryOptions);

  const label = isPending ? '…' : isError || data.status !== 'ok' ? 'down' : 'OK';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <p role="status" className="text-2xl font-semibold text-foreground">
        {label}
      </p>
    </main>
  );
}
