import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { healthQueryOptions } from './queries';

export function HealthStatus() {
  const { t } = useTranslation('health');
  const { isPending, isError } = useQuery(healthQueryOptions);

  const label = isPending ? t('status.loading') : isError ? t('status.down') : t('status.ok');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <p role="status" className="text-2xl font-semibold text-foreground">
        {label}
      </p>
    </main>
  );
}
