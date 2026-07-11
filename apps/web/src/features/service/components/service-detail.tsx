import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { StatStrip } from '@/components/StatStrip';
import { Card, CardContent } from '@/components/ui/card';
import { serviceRecordQueryOptions, useDeleteServiceRecord } from '@/features/service/queries';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';

export function ServiceDetailPage() {
  const { vehicleId, recordId }: { vehicleId: string; recordId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/service/$recordId',
  });
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('service');
  const { t: tc } = useTranslation('common');
  const currency = useCurrencyPref();
  const locale = i18n.resolvedLanguage ?? 'en';

  const {
    data: record,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(serviceRecordQueryOptions(vehicleId, recordId));

  const deleteMutation = useDeleteServiceRecord(vehicleId);

  async function handleDelete() {
    if (!record) return;
    if (window.confirm(t('delete.confirmMessage', { title: record.title }))) {
      await deleteMutation.mutateAsync(recordId);
      await navigate({ to: '/vehicles/$vehicleId/service', params: { vehicleId } });
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !record) {
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

  return (
    <PageContainer>
      <Link
        to="/vehicles/$vehicleId/service"
        params={{ vehicleId }}
        className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        {t('detail.backToServices')}
      </Link>

      <PageHeader
        title={t('detail.title', { title: record.title })}
        action={
          <div className="flex items-center gap-1">
            <Link
              to="/vehicles/$vehicleId/service/$recordId/edit"
              params={{ vehicleId, recordId }}
              aria-label={tc('actions.edit')}
              title={tc('actions.edit')}
              className={editActionClassName}
            >
              <EditActionIcon />
            </Link>
            <DeleteAction onClick={() => void handleDelete()} disabled={deleteMutation.isPending} />
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-0">
          <StatStrip
            stats={[
              { label: t('fields.mileage'), value: t('list.mileage', { mileage: record.mileage }) },
              {
                label: t('fields.laborCost'),
                value: formatMoney(record.laborCost, currency, locale),
              },
              {
                label: t('fields.totalCost'),
                value: formatMoney(record.totalCost, currency, locale),
                highlight: true,
              },
            ]}
          />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <dl className="divide-y text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">{t('fields.serviceDate')}</dt>
              <dd className="font-medium">{record.serviceDate}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">{t('fields.workshopName')}</dt>
              <dd className="font-medium">{record.workshopName || t('list.noWorkshop')}</dd>
            </div>
            <div className="py-2.5">
              <dt className="text-muted-foreground">{t('detail.description')}</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium">
                {record.description || t('detail.noDescription')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h2 className="font-display text-base font-semibold">{t('fields.parts')}</h2>
          {record.parts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t('list.noParts')}</p>
          ) : (
            <div className="mt-3 space-y-3">
              {record.parts.map((part) => (
                <div key={part.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{part.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {part.manufacturer || '—'}
                        {part.partNumber ? ` • ${part.partNumber}` : ''}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>
                        {t('fields.quantity')}
                        {': '}
                        {part.quantity}
                      </p>
                      <p className="font-medium">
                        {part.totalPrice != null
                          ? formatMoney(part.totalPrice, currency, locale)
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
