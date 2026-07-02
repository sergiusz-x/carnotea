import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { type SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { ListCard } from '@/components/ListCard';
import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAddMileageReading,
  useDeleteMileageReading,
  useDeleteVehicle,
  mileageReadingsQueryOptions,
  vehicleQueryOptions,
} from '@/features/vehicles/queries';
import { useLastMileage } from '@/lib/useLastMileage';

import { supportsCharging, supportsFuelLogs } from '../vehicle-usage';

interface MileageReadingRow {
  id: string;
  readingDate: string;
  mileage: number;
  sourceType: string;
  note: string | null;
}

function MileageSectionContent({ vehicleId }: { vehicleId: string }) {
  const { t } = useTranslation('vehicles');
  const { data: mileageReadings } = useQuery(mileageReadingsQueryOptions(vehicleId));
  const defaultMileage = useLastMileage(vehicleId);
  const addReading = useAddMileageReading(vehicleId);
  const deleteReading = useDeleteMileageReading(vehicleId);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [note, setNote] = useState('');

  const resolvedMileage =
    mileage === '' && defaultMileage !== undefined ? String(defaultMileage) : mileage;

  function handleAddReading(e: SyntheticEvent) {
    e.preventDefault();
    addReading
      .mutateAsync({
        readingDate,
        mileage: Number(resolvedMileage),
        note: note || null,
      })
      .then(() => {
        setMileage('');
        setNote('');
      })
      .catch(() => {
        // Error is surfaced by mutation state in future UI work.
      });
  }

  const readings = Array.isArray(mileageReadings) ? mileageReadings : [];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t('detail.mileageSection')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAddReading} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="mileage-reading-date" className="text-xs text-muted-foreground">
              {t('mileageForm.readingDate')}
            </Label>
            <Input
              id="mileage-reading-date"
              type="date"
              value={readingDate}
              onChange={(e) => {
                setReadingDate(e.target.value);
              }}
              className="h-9 py-1"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="mileage-reading-value" className="text-xs text-muted-foreground">
              {t('mileageForm.mileage')}
            </Label>
            <Input
              id="mileage-reading-value"
              type="number"
              value={resolvedMileage}
              onChange={(e) => {
                setMileage(e.target.value);
              }}
              placeholder={t('mileageForm.mileage')}
              className="h-9 py-1"
              min={0}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="mileage-reading-note" className="text-xs text-muted-foreground">
              {t('mileageForm.note')}
            </Label>
            <Input
              id="mileage-reading-note"
              type="text"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
              }}
              placeholder={t('mileageForm.note')}
              className="h-9 py-1"
            />
          </div>
          <Button type="submit" disabled={addReading.isPending}>
            {addReading.isPending ? t('mileageForm.adding') : t('mileageForm.submit')}
          </Button>
        </form>

        <div>
          <h3 className="mb-2 text-sm font-medium">{t('detail.mileage.history')}</h3>
          {readings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('detail.mileage.noReadings')}</p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {readings.map((reading: MileageReadingRow) => (
                <div
                  key={reading.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>{reading.readingDate}</span>
                      <span className="font-medium tnum">
                        {t('list.mileage', { mileage: reading.mileage })}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{t('detail.mileage.source', { source: reading.sourceType })}</span>
                      {reading.note && <span>{reading.note}</span>}
                    </div>
                  </div>
                  <DeleteAction
                    onClick={() => void deleteReading.mutateAsync(reading.id)}
                    disabled={deleteReading.isPending}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function VehicleDetailPage() {
  const { vehicleId } = useParams({ from: '/_authenticated/vehicles/$vehicleId' });
  const { t } = useTranslation('vehicles');
  const { t: tc } = useTranslation('common');

  const {
    data: vehicle,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(vehicleQueryOptions(vehicleId));

  const deleteMutation = useDeleteVehicle();

  function handleDelete() {
    if (!vehicle) return;
    if (
      window.confirm(t('delete.confirmMessage', { brand: vehicle.brand, model: vehicle.model }))
    ) {
      void deleteMutation.mutateAsync(vehicleId);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !vehicle) {
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

  const showFuel = supportsFuelLogs(vehicle.fuelType);
  const showCharging = supportsCharging(vehicle.fuelType);
  const navLinkClass = 'rounded-xl border p-3 text-sm transition-colors hover:bg-accent';

  return (
    <PageContainer>
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model}`}
        action={
          <div className="flex items-center gap-1">
            <Link
              to="/vehicles/$vehicleId/edit"
              params={{ vehicleId }}
              aria-label={tc('actions.edit')}
              title={tc('actions.edit')}
              className={editActionClassName}
            >
              <EditActionIcon />
            </Link>
            <DeleteAction onClick={handleDelete} disabled={deleteMutation.isPending} />
          </div>
        }
      />
      <p className="-mt-4 mb-6 text-sm text-muted-foreground tnum">
        {vehicle.productionYear}
        {vehicle.engine && ` · ${vehicle.engine}`}
        {' · '}
        {t('list.mileage', { mileage: vehicle.currentMileage })}
      </p>

      <ListCard
        className="mb-6"
        primary={
          <span className="font-display text-base font-semibold">
            {t('detail.title', { brand: vehicle.brand, model: vehicle.model })}
          </span>
        }
      >
        <dl className="divide-y border-t px-4 text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-muted-foreground">{t('fields.fuelType')}</dt>
            <dd className="font-medium">{vehicle.fuelType}</dd>
          </div>
          {vehicle.generation && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">{t('fields.generation')}</dt>
              <dd className="font-medium">{vehicle.generation}</dd>
            </div>
          )}
          {vehicle.vin && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">{t('fields.vin')}</dt>
              <dd className="font-medium">{vehicle.vin}</dd>
            </div>
          )}
          {vehicle.registrationNumber && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">{t('fields.registrationNumber')}</dt>
              <dd className="font-medium">{vehicle.registrationNumber}</dd>
            </div>
          )}
          <div className="flex justify-between py-2.5">
            <dt className="text-muted-foreground">{t('fields.currentMileage')}</dt>
            <dd className="font-medium tnum">
              {t('list.mileage', { mileage: vehicle.currentMileage })}
            </dd>
          </div>
          <div className="flex justify-between py-2.5">
            <dt className="text-muted-foreground">{t('fields.currencyCode')}</dt>
            <dd className="font-medium">{vehicle.currencyCode}</dd>
          </div>
        </dl>
      </ListCard>

      <MileageSectionContent vehicleId={vehicleId} />

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.logsSection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <nav
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            aria-label={t('detail.logsSection')}
          >
            {showFuel && (
              <Link to="/vehicles/$vehicleId/fuel" params={{ vehicleId }} className={navLinkClass}>
                {t('detail.nav.fuel')}
              </Link>
            )}
            {showCharging && (
              <Link
                to="/vehicles/$vehicleId/charging"
                params={{ vehicleId }}
                className={navLinkClass}
              >
                {t('detail.nav.charging')}
              </Link>
            )}
            <Link to="/vehicles/$vehicleId/service" params={{ vehicleId }} className={navLinkClass}>
              {t('detail.nav.service')}
            </Link>
            <Link to="/vehicles/$vehicleId/issues" params={{ vehicleId }} className={navLinkClass}>
              {t('detail.nav.issues')}
            </Link>
            <Link
              to="/vehicles/$vehicleId/expenses"
              params={{ vehicleId }}
              className={navLinkClass}
            >
              {t('detail.nav.expenses')}
            </Link>
            <Link
              to="/vehicles/$vehicleId/reminders"
              params={{ vehicleId }}
              className={navLinkClass}
            >
              {t('detail.nav.reminders')}
            </Link>
          </nav>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
