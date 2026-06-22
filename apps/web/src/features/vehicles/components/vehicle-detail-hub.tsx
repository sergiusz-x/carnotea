import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { type SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useDeleteVehicle,
  useAddMileageReading,
  vehicleQueryOptions,
  mileageReadingsQueryOptions,
} from '@/features/vehicles/queries';

// ─── Mileage sub-section ───────────────────────────────────────────────────────

function MileageSectionContent({ vehicleId }: { vehicleId: string }) {
  const { t } = useTranslation('vehicles');
  const { data: mileageReadings } = useQuery(
    mileageReadingsQueryOptions(vehicleId),
  );
  const addReading = useAddMileageReading(vehicleId);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [note, setNote] = useState('');

  function handleAddReading(e: SyntheticEvent) {
    e.preventDefault();
    addReading.mutateAsync({
      readingDate,
      mileage: Number(mileage),
      note: note || null,
    }).then(() => {
      setMileage('');
      setNote('');
    }).catch(() => {
      // Error handled by mutation
    });
  }

  const readings = Array.isArray(mileageReadings) ? mileageReadings : [];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t('detail.mileageSection')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add reading form */}
        <form onSubmit={handleAddReading} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="mileage-reading-date" className="text-xs text-muted-foreground">
              {t('mileageForm.readingDate')}
            </label>
            <input
              id="mileage-reading-date"
              type="date"
              value={readingDate}
              onChange={(e) => { setReadingDate(e.target.value); }}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="mileage-reading-value" className="text-xs text-muted-foreground">
              {t('mileageForm.mileage')}
            </label>
            <input
              id="mileage-reading-value"
              type="number"
              value={mileage}
              onChange={(e) => { setMileage(e.target.value); }}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
              placeholder={t('mileageForm.mileage')}
              min={0}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="mileage-reading-note" className="text-xs text-muted-foreground">
              {t('mileageForm.note')}
            </label>
            <input
              id="mileage-reading-note"
              type="text"
              value={note}
              onChange={(e) => { setNote(e.target.value); }}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
              placeholder={t('mileageForm.note')}
            />
          </div>
          <Button type="submit" disabled={addReading.isPending}>
            {addReading.isPending ? '…' : t('mileageForm.submit')}
          </Button>
        </form>

        {/* Reading history */}
        <div>
          <h3 className="mb-2 text-sm font-medium">{t('detail.mileage.history')}</h3>
          {readings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('detail.mileage.noReadings')}</p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {readings.map((reading: {
                id: string;
                readingDate: string;
                mileage: number;
                sourceType: string;
                note: string | null;
              }) => (
                <div
                  key={reading.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{reading.readingDate}</span>
                  <span className="font-medium">
                    {t('list.mileage', { mileage: reading.mileage })}
                  </span>
                  {reading.note && (
                    <span className="text-xs text-muted-foreground">{reading.note}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main detail page ──────────────────────────────────────────────────────────

export function VehicleDetailPage() {
  const { vehicleId } = useParams({ from: '/_authenticated/vehicles/$vehicleId' });
  const { t } = useTranslation('vehicles');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: vehicle, isLoading, isError, error, refetch } = useQuery(
    vehicleQueryOptions(vehicleId),
  );

  const deleteMutation = useDeleteVehicle();

  function handleDelete() {
    void deleteMutation.mutateAsync(vehicleId);
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (isError || !vehicle) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="space-y-4">
          <p>{t('error.load')}</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <button type="button" className="btn" onClick={() => { void refetch(); }}>
            {t('error.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
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
            onClick={() => { setShowDeleteConfirm(true); }}
          >
            {t('detail.deleteButton')}
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <Card className="mb-6 border-destructive">
          <CardHeader>
            <CardTitle>{t('delete.confirmTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              {t('delete.confirmMessage', {
                brand: vehicle.brand,
                model: vehicle.model,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={() => { handleDelete(); }}
                disabled={deleteMutation.isPending}
              >
                {t('delete.confirm')}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowDeleteConfirm(false); }}
              >
                {t('delete.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle details card */}
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

      {/* Mileage section */}
      <MileageSectionContent vehicleId={vehicleId} />

      {/* Navigation links to child areas (stubs for T-034+) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.logsSection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label={t('detail.logsSection')}>
            <a
              href={`/vehicles/${String(vehicleId)}/fuel`}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.fuel')}
            </a>
            <a
              href={`/vehicles/${String(vehicleId)}/charging`}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.charging')}
            </a>
            <a
              href={`/vehicles/${String(vehicleId)}/service`}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.service')}
            </a>
            <a
              href={`/vehicles/${String(vehicleId)}/issues`}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.issues')}
            </a>
            <a
              href={`/vehicles/${String(vehicleId)}/expenses`}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.expenses')}
            </a>
            <a
              href={`/vehicles/${String(vehicleId)}/reminders`}
              className="rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              {t('detail.nav.reminders')}
            </a>
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}