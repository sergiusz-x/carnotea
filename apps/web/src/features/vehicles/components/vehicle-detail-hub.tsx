import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { type SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useDeleteVehicle,
  useAddMileageReading,
  useDeleteMileageReading,
  vehicleQueryOptions,
  mileageReadingsQueryOptions,
} from '@/features/vehicles/queries';

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
  const addReading = useAddMileageReading(vehicleId);
  const deleteReading = useDeleteMileageReading(vehicleId);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [note, setNote] = useState('');

  function handleAddReading(e: SyntheticEvent) {
    e.preventDefault();
    addReading
      .mutateAsync({
        readingDate,
        mileage: Number(mileage),
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
              value={mileage}
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>{reading.readingDate}</span>
                      <span className="font-medium">
                        {t('list.mileage', { mileage: reading.mileage })}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{t('detail.mileage.source', { source: reading.sourceType })}</span>
                      {reading.note && <span>{reading.note}</span>}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deleteReading.isPending}
                    onClick={() => void deleteReading.mutateAsync(reading.id)}
                  >
                    {deleteReading.isPending ? t('mileageForm.deleting') : t('mileageForm.delete')}
                  </Button>
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    data: vehicle,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(vehicleQueryOptions(vehicleId));

  const deleteMutation = useDeleteVehicle();

  function handleDelete() {
    void deleteMutation.mutateAsync(vehicleId);
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

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {vehicle.brand} {vehicle.model}
          </h1>
          <p className="text-muted-foreground">
            {vehicle.productionYear}
            {vehicle.engine && ` · ${vehicle.engine}`}
            {' · '}
            {t('list.mileage', { mileage: vehicle.currentMileage })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/vehicles/$vehicleId/edit" params={{ vehicleId }}>
            <Button variant="outline">{t('detail.editButton')}</Button>
          </Link>
          <Button
            variant="destructive"
            onClick={() => {
              setShowDeleteConfirm(true);
            }}
          >
            {t('detail.deleteButton')}
          </Button>
        </div>
      </div>

      {showDeleteConfirm && (
        <Card className="mb-6 border-destructive">
          <CardHeader>
            <CardTitle>{t('delete.confirmTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{t('delete.confirmMessage', { brand: vehicle.brand, model: vehicle.model })}</p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? t('delete.deleting') : t('delete.confirm')}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                }}
              >
                {t('delete.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('detail.title', { brand: vehicle.brand, model: vehicle.model })}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">{t('fields.brand')}</dt>
            <dd>{vehicle.brand}</dd>
            <dt className="text-muted-foreground">{t('fields.model')}</dt>
            <dd>{vehicle.model}</dd>
            {vehicle.generation && (
              <>
                <dt className="text-muted-foreground">{t('fields.generation')}</dt>
                <dd>{vehicle.generation}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{t('fields.productionYear')}</dt>
            <dd>{vehicle.productionYear}</dd>
            {vehicle.engine && (
              <>
                <dt className="text-muted-foreground">{t('fields.engine')}</dt>
                <dd>{vehicle.engine}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{t('fields.fuelType')}</dt>
            <dd>{vehicle.fuelType}</dd>
            {vehicle.vin && (
              <>
                <dt className="text-muted-foreground">{t('fields.vin')}</dt>
                <dd>{vehicle.vin}</dd>
              </>
            )}
            {vehicle.registrationNumber && (
              <>
                <dt className="text-muted-foreground">{t('fields.registrationNumber')}</dt>
                <dd>{vehicle.registrationNumber}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{t('fields.currentMileage')}</dt>
            <dd>{t('list.mileage', { mileage: vehicle.currentMileage })}</dd>
            <dt className="text-muted-foreground">{t('fields.currencyCode')}</dt>
            <dd>{vehicle.currencyCode}</dd>
          </dl>
        </CardContent>
      </Card>

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
            <Link
              to="/vehicles/$vehicleId/fuel"
              params={{ vehicleId }}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.fuel')}
            </Link>
            <Link
              to="/vehicles/$vehicleId/charging"
              params={{ vehicleId }}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.charging')}
            </Link>
            <Link
              to="/vehicles/$vehicleId/service"
              params={{ vehicleId }}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.service')}
            </Link>
            <Link
              to="/vehicles/$vehicleId/issues"
              params={{ vehicleId }}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.issues')}
            </Link>
            <Link
              to="/vehicles/$vehicleId/expenses"
              params={{ vehicleId }}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.expenses')}
            </Link>
            <Link
              to="/vehicles/$vehicleId/reminders"
              params={{ vehicleId }}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.reminders')}
            </Link>
          </nav>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
