import type { DueState, IssuePriorityCode } from '@carnotea/shared';
import { Link } from '@tanstack/react-router';
import type { TFunction } from 'i18next';
import {
  BatteryCharging,
  Bell,
  CreditCard,
  Droplet,
  Fuel,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ListCard } from '@/components/ListCard';
import { Badge } from '@/components/ui/badge';
import { issuePriorityBadgeVariant } from '@/features/issues/badge-variants';
import { reminderDueStateBadgeVariant } from '@/features/reminders/badge-variants';
import { formatDate, formatMoney } from '@/lib/format';

import type { ActivityFeedEntry } from '../queries';

const issuePriorityKeys: Record<IssuePriorityCode, `priority.${IssuePriorityCode}`> = {
  low: 'priority.low',
  medium: 'priority.medium',
  high: 'priority.high',
  critical: 'priority.critical',
};

const dueStateKeys: Record<DueState, `dueState.${DueState}`> = {
  overdue: 'dueState.overdue',
  due_soon: 'dueState.due_soon',
  ok: 'dueState.ok',
};

function formatOccurredAt(date: string, locale: string): string {
  return formatDate(new Date(`${date}T00:00:00`), locale);
}

function formatMileage(
  mileage: number | null,
  locale: string,
  t: TFunction<'activity'>,
): string | null {
  if (mileage == null) return null;
  return t('entry.mileage', { mileage: new Intl.NumberFormat(locale).format(mileage) });
}

function formatOptionalMoney(
  amount: number | null,
  currency: string,
  locale: string,
  t: TFunction<'activity'>,
): string {
  return amount == null ? t('panel.none') : formatMoney(amount, currency, locale);
}

function MoneyValue({ children }: { children: ReactNode }) {
  return (
    <span className="font-display text-lg font-semibold tnum text-foreground">{children}</span>
  );
}

function useEntryMeta(entry: ActivityFeedEntry, locale: string, currency: string) {
  const { t } = useTranslation('activity');
  const { t: tf } = useTranslation('fluid-logs');

  switch (entry.kind) {
    case 'fuel':
      return {
        icon: <Fuel className="h-4 w-4" aria-hidden="true" />,
        kindLabel: t('filter.fuel'),
        title: t('entry.fuel'),
        right: <MoneyValue>{formatOptionalMoney(entry.totalCost, currency, locale, t)}</MoneyValue>,
      };
    case 'charge':
      return {
        icon: <BatteryCharging className="h-4 w-4" aria-hidden="true" />,
        kindLabel: t('filter.charge'),
        title: t('entry.charge'),
        right: <MoneyValue>{formatOptionalMoney(entry.totalCost, currency, locale, t)}</MoneyValue>,
      };
    case 'fluid':
      return {
        icon: <Droplet className="h-4 w-4" aria-hidden="true" />,
        kindLabel: t('filter.fluid'),
        title: tf(`fluidType.${entry.fluidType}`),
        right: <MoneyValue>{formatOptionalMoney(entry.cost, currency, locale, t)}</MoneyValue>,
      };
    case 'service':
      return {
        icon: <Wrench className="h-4 w-4" aria-hidden="true" />,
        kindLabel: t('filter.service'),
        title: entry.title,
        right: <MoneyValue>{formatOptionalMoney(entry.totalCost, currency, locale, t)}</MoneyValue>,
      };
    case 'expense':
      return {
        icon: <CreditCard className="h-4 w-4" aria-hidden="true" />,
        kindLabel: t('filter.expense'),
        title: entry.description || t('entry.expense'),
        right: <MoneyValue>{formatOptionalMoney(entry.amount, currency, locale, t)}</MoneyValue>,
      };
    case 'issue':
      return {
        icon: <TriangleAlert className="h-4 w-4" aria-hidden="true" />,
        kindLabel: t('filter.issue'),
        title: entry.title,
        right: (
          <Badge variant={issuePriorityBadgeVariant[entry.priority] ?? 'default'}>
            {t(issuePriorityKeys[entry.priority])}
          </Badge>
        ),
      };
    case 'reminder':
      return {
        icon: <Bell className="h-4 w-4" aria-hidden="true" />,
        kindLabel: t('filter.reminder'),
        title: entry.title,
        right: (
          <Badge variant={reminderDueStateBadgeVariant[entry.dueState] ?? 'outline'}>
            {t(dueStateKeys[entry.dueState])}
          </Badge>
        ),
      };
  }
}

/** Routes each entry to the same screen its own feature list already uses to open it. */
function EntryLink({
  entry,
  vehicleId,
  className,
  children,
}: {
  entry: ActivityFeedEntry;
  vehicleId: string;
  className?: string;
  children: ReactNode;
}) {
  switch (entry.kind) {
    case 'fuel':
      return (
        <Link
          to="/vehicles/$vehicleId/fuel/$fuelId"
          params={{ vehicleId, fuelId: entry.id }}
          className={className}
        >
          {children}
        </Link>
      );
    case 'charge':
      return (
        <Link
          to="/vehicles/$vehicleId/charging/$sessionId/edit"
          params={{ vehicleId, sessionId: entry.id }}
          className={className}
        >
          {children}
        </Link>
      );
    case 'fluid':
      return (
        <Link
          to="/vehicles/$vehicleId/fluid-logs/$logId/edit"
          params={{ vehicleId, logId: entry.id }}
          className={className}
        >
          {children}
        </Link>
      );
    case 'service':
      return (
        <Link
          to="/vehicles/$vehicleId/service/$recordId/edit"
          params={{ vehicleId, recordId: entry.id }}
          className={className}
        >
          {children}
        </Link>
      );
    case 'expense':
      return (
        <Link
          to="/vehicles/$vehicleId/expenses/$expenseId/edit"
          params={{ vehicleId, expenseId: entry.id }}
          className={className}
        >
          {children}
        </Link>
      );
    case 'issue':
      return (
        <Link
          to="/vehicles/$vehicleId/issues/$issueId"
          params={{ vehicleId, issueId: entry.id }}
          className={className}
        >
          {children}
        </Link>
      );
    case 'reminder':
      return (
        <Link
          to="/vehicles/$vehicleId/reminders/$reminderId"
          params={{ vehicleId, reminderId: entry.id }}
          className={className}
        >
          {children}
        </Link>
      );
  }
}

export function ActivityEntryCard({
  entry,
  vehicleId,
  currency,
  locale,
}: {
  entry: ActivityFeedEntry;
  vehicleId: string;
  currency: string;
  locale: string;
}) {
  const { t } = useTranslation('activity');
  const meta = useEntryMeta(entry, locale, currency);
  const mileage = formatMileage(entry.mileage, locale, t);
  const subtitle = [formatOccurredAt(entry.occurredAt, locale), mileage]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  return (
    <ListCard
      primary={
        <EntryLink
          entry={entry}
          vehicleId={vehicleId}
          className="group flex min-w-0 items-center gap-3"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            aria-label={meta.kindLabel}
            title={meta.kindLabel}
          >
            {meta.icon}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-display text-base font-semibold tracking-tight group-hover:underline">
              {meta.title}
            </span>
            <span className="truncate text-sm text-muted-foreground tnum">{subtitle}</span>
          </span>
        </EntryLink>
      }
      className="border-border/80"
    >
      <div className="flex justify-end px-4 pb-4">{meta.right}</div>
    </ListCard>
  );
}
