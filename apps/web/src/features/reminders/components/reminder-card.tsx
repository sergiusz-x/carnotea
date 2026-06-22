import type { DueState, ReminderStatusCode } from '@carnotea/shared';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

// Due-state badge key lookup — avoids template-literal type-widening issues with i18next.
const dueStateKey = (ds: string): `dueState.${DueState}` =>
  `dueState.${ds as DueState}` as `dueState.${DueState}`;

interface ReminderCardProps {
  id: string;
  title: string;
  status: string;
  dueState: string;
  dueDate: string | null;
  dueMileage: number | null;
  onDelete: (id: string, title: string) => void;
  onMarkDone: (id: string) => void;
  isDeleting: boolean;
  isMarking: boolean;
}

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'default',
  done: 'outline',
  cancelled: 'destructive',
};

const dueStateBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  overdue: 'destructive',
  due_soon: 'secondary',
  ok: 'outline',
};

export function ReminderCard({
  id,
  title,
  status,
  dueState,
  dueDate,
  dueMileage,
  onDelete,
  onMarkDone,
  isDeleting,
  isMarking,
}: ReminderCardProps) {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/reminders',
  });
  const { t } = useTranslation('reminders');

  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Link
              to="/vehicles/$vehicleId/reminders/$reminderId"
              params={{ vehicleId, reminderId: id }}
              className="font-medium hover:underline"
            >
              {title}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusBadgeVariant[status] ?? 'default'}>
              {t(`status.${status as ReminderStatusCode}`)}
            </Badge>
            <Badge variant={dueStateBadgeVariant[dueState] ?? 'outline'}>
              {t(dueStateKey(dueState))}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {dueDate ? (
              <span>{t('list.dueDate', { date: dueDate })}</span>
            ) : (
              <span>{t('list.noDueDate')}</span>
            )}
            {dueMileage != null && (
              <span className="ml-4">{t('list.dueMileage', { value: dueMileage })}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {status === 'pending' && (
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
              onClick={() => {
                onMarkDone(id);
              }}
              disabled={isMarking}
            >
              {isMarking ? t('list.marking') : t('list.markDone')}
            </button>
          )}
          <Link
            to="/vehicles/$vehicleId/reminders/$reminderId/edit"
            params={{ vehicleId, reminderId: id }}
          >
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {t('edit.submit')}
            </button>
          </Link>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground shadow hover:bg-destructive/90 disabled:opacity-50"
            onClick={() => {
              onDelete(id, title);
            }}
            disabled={isDeleting}
          >
            {t('delete.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
