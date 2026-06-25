import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ServiceCard } from '@/features/service/components/service-card';
import { serviceRecordsQueryOptions, useDeleteServiceRecord } from '@/features/service/queries';

interface ServicePart {
  id: string;
  name: string;
  manufacturer: string | null;
  partNumber: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
}

interface ServiceRecord {
  id: string;
  serviceDate: string;
  mileage: number;
  title: string;
  description: string | null;
  laborCost: number;
  totalCost: number;
  workshopName: string | null;
  parts: ServicePart[];
}

export function ServiceListPage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/service',
  });
  const { t } = useTranslation('service');

  const {
    data: records,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(serviceRecordsQueryOptions(vehicleId));

  const deleteMutation = useDeleteServiceRecord(vehicleId);

  function handleDelete(id: string, title: string) {
    if (window.confirm(t('delete.confirmMessage', { title }))) {
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

  if (isError || !records) {
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

  const items = Array.isArray(records) ? records : [];

  return (
    <PageContainer>
      <PageHeader
        title={t('pageTitle')}
        action={
          <Link to="/vehicles/$vehicleId/service/new" params={{ vehicleId }}>
            <Button>{t('addService')}</Button>
          </Link>
        }
      />

      {items.length === 0 && (
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Link to="/vehicles/$vehicleId/service/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          }
        />
      )}

      {/* Service records */}
      {items.length > 0 && (
        <div className="space-y-4">
          {items.map((record: ServiceRecord) => (
            <div key={record.id} className="group relative">
              <Link
                to="/vehicles/$vehicleId/service/$recordId/edit"
                params={{ vehicleId, recordId: record.id }}
              >
                <ServiceCard record={record} />
              </Link>
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 z-10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => {
                  handleDelete(record.id, record.title);
                }}
                disabled={deleteMutation.isPending}
                title={t('delete.confirm')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
