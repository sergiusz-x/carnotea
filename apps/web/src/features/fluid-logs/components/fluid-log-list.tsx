import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { FluidLogCard } from '@/features/fluid-logs/components/fluid-log-card';
import { fluidLogsQueryOptions, useDeleteFluidLog } from '@/features/fluid-logs/queries';

export function FluidLogListPage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/fluid-logs',
  });
  const { t } = useTranslation('fluid-logs');

  const {
    data: logs,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(fluidLogsQueryOptions(vehicleId));

  const deleteMutation = useDeleteFluidLog(vehicleId);

  function handleDelete(id: string, changeDate: string) {
    if (window.confirm(t('delete.confirmMessage', { date: changeDate }))) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      deleteMutation.mutateAsync(id);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !logs) {
    return (
      <PageContainer>
        <ErrorState
          message={t('error.load')}
          detail={error instanceof Error ? error.message : String(error)}
          onRetry={() => void refetch()}
          retryLabel={t('error.retry')}
        />
      </PageContainer>
    );
  }

  const list = Array.isArray(logs) ? logs : [];

  return (
    <PageContainer>
      <PageHeader
        title={t('pageTitle')}
        action={
          <Link to="/vehicles/$vehicleId/fluid-logs/new" params={{ vehicleId }}>
            <Button>{t('addFluidLog')}</Button>
          </Link>
        }
      />

      {list.length === 0 && (
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Link to="/vehicles/$vehicleId/fluid-logs/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          }
        />
      )}

      {list.length > 0 && (
        <div className="space-y-4">
          {list.map(
            (log: {
              id: string;
              changeDate: string;
              mileage: number;
              fluidType: string;
              quantityLiters: number | null;
              cost: number | null;
              workshopName: string | null;
              nextDueMileage: number | null;
              nextDueDate: string | null;
            }) => (
              <FluidLogCard
                key={log.id}
                id={log.id}
                changeDate={log.changeDate}
                mileage={log.mileage}
                fluidType={log.fluidType}
                quantityLiters={log.quantityLiters}
                cost={log.cost}
                workshopName={log.workshopName}
                nextDueMileage={log.nextDueMileage}
                nextDueDate={log.nextDueDate}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ),
          )}
        </div>
      )}
    </PageContainer>
  );
}
