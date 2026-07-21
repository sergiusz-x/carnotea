import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { StatStrip } from '@/components/StatStrip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supportsCharging, supportsFuelLogs } from '@/features/vehicles/vehicle-usage';
import { formatDate, formatMoney } from '@/lib/format';

import type { VehiclePanelData } from '../queries';

function formatTrend(
  current: number | null,
  previous: number | null,
  t: TFunction<'activity'>,
): string {
  if (current == null || previous == null || previous <= 0 || current === previous) {
    return t('panel.trendFlat');
  }

  const pct = Math.round((Math.abs(current - previous) / previous) * 100);
  return current < previous ? t('panel.trendDown', { pct }) : t('panel.trendUp', { pct });
}

function formatOptionalMoney(
  amount: number | null,
  currency: string,
  locale: string,
  t: TFunction<'activity'>,
): string {
  return amount == null ? t('panel.none') : formatMoney(amount, currency, locale);
}

function formatNextService(
  nextService: VehiclePanelData['nextService'],
  locale: string,
  t: TFunction<'activity'>,
): string {
  if (nextService == null) return t('panel.none');

  return [
    nextService.dueDate
      ? t('panel.dueDate', {
          date: formatDate(new Date(`${nextService.dueDate}T00:00:00`), locale),
        })
      : null,
    nextService.dueInKm != null
      ? nextService.dueInKm >= 0
        ? t('panel.dueKm', {
            km: new Intl.NumberFormat(locale).format(nextService.dueInKm),
          })
        : t('panel.overdueKm', {
            km: new Intl.NumberFormat(locale).format(Math.abs(nextService.dueInKm)),
          })
      : null,
  ]
    .filter((item): item is string => Boolean(item))
    .join(' • ');
}

function formatChargeValue(
  energy: VehiclePanelData['energy'],
  locale: string,
  t: TFunction<'activity'>,
): string {
  if (energy == null || energy.kind !== 'charge' || energy.socPercent == null) {
    return t('panel.none');
  }

  return t('panel.chargePercent', {
    value: new Intl.NumberFormat(locale).format(energy.socPercent),
  });
}

function formatAvgConsumption(
  avgConsumption: VehiclePanelData['avgConsumption'],
  t: TFunction<'activity'>,
): string {
  if (avgConsumption == null) return t('panel.none');

  return avgConsumption.unit === 'kwh_per_100km'
    ? t('panel.energyConsumption', { value: avgConsumption.value.toFixed(1) })
    : t('panel.fuelConsumption', { value: avgConsumption.value.toFixed(1) });
}

export function VehiclePanelCard({ panel, locale }: { panel: VehiclePanelData; locale: string }) {
  const { t } = useTranslation('activity');

  const nextService = formatNextService(panel.nextService, locale, t);
  const chargeValue = formatChargeValue(panel.energy, locale, t);
  const avgConsumption = formatAvgConsumption(panel.avgConsumption, t);

  return (
    <Card className="border-border/80">
      <CardHeader className="gap-4 border-b pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-micro">{t('feed.title')}</p>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {panel.brand} {panel.model}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{panel.productionYear}</p>
          </div>
          <Badge variant="outline">{t('panel.active')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <StatStrip
          stats={[
            {
              label: t('panel.mileage'),
              value: new Intl.NumberFormat(locale).format(panel.currentMileage),
              highlight: true,
            },
            ...(supportsCharging(panel.fuelType)
              ? [{ label: t('panel.charge'), value: chargeValue }]
              : []),
            { label: t('panel.nextService'), value: nextService },
            {
              label: t('panel.monthCost'),
              value: formatOptionalMoney(panel.monthCost.total, panel.currency, locale, t),
            },
            ...(supportsFuelLogs(panel.fuelType) || panel.avgConsumption?.unit === 'kwh_per_100km'
              ? [{ label: t('panel.avgConsumption'), value: avgConsumption }]
              : []),
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground">
          <span>
            {`${t('panel.trendLabel')}: ${formatTrend(panel.monthCost.total, panel.monthCost.prevTotal, t)}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
