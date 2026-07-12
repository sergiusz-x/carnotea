import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';

import { useSession } from './use-session';

interface SessionGateProps {
  children: ReactNode;
}

export function SessionGate({ children }: SessionGateProps) {
  const { t } = useTranslation('auth');
  const { isPending, isError, error, refetch } = useSession();

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">{t('session.loading')}</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm">
          <ErrorState
            message={t('session.errorTitle')}
            detail={error instanceof Error ? error.message : t('session.errorDetail')}
            onRetry={() => {
              void refetch();
            }}
            retryLabel={t('session.retry')}
          />
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t('session.reload')}
          </Button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
