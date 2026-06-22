import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (isError || !records) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="space-y-4">
          <p>{t('error.load')}</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void refetch();
            }}
          >
            {t('error.retry')}
          </button>
        </div>
      </div>
    );
  }

  const items = Array.isArray(records) ? records : [];

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
        <Link to="/vehicles/$vehicleId/service/new" params={{ vehicleId }}>
          <Button>{t('addService')}</Button>
        </Link>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('empty.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t('empty.description')}</p>
            <Link to="/vehicles/$vehicleId/service/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          </CardContent>
        </Card>
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
    </div>
  );
}
