import type { ReminderStatusCode } from '@carnotea/shared';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ListCard } from '@/components/ListCard';
import {
  DeleteAction,
  EditActionIcon,
  editActionClassName,
  MarkDoneAction,
} from '@/components/ListCardActions';
import { Badge } from '@/components/ui/badge';
import {
  dueStateKey,
  reminderDueStateBadgeVariant,
  reminderStatusBadgeVariant,
} from '@/features/reminders/badge-variants';

interface ReminderCardProps {
  id: string;
  title: string;
  status: ReminderStatusCode;
  dueState: string;
  mode: 'one_off' | 'recurring';
  dueDate?: string | null;
  dueMileage?: number | null;
  nextDueDate?: string | null;
  nextDueMileage?: number | null;
  onDelete: (id: string, title: string) => void;
  onMarkDone: (id: string) => void;
  isDeleting: boolean;
  isMarking: boolean;
}

export function ReminderCard({
  id,
  title,
  status,
  dueState,
  mode,
  dueDate,
  dueMileage,
  nextDueDate,
  nextDueMileage,
  onDelete,
  onMarkDone,
  isDeleting,
  isMarking,
}: ReminderCardProps) {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/reminders',
  });
  const { t } = useTranslation('reminders');
  const { t: tc } = useTranslation('common');

  const displayDate = mode === 'recurring' ? (nextDueDate ?? null) : (dueDate ?? null);
  const displayMileage = mode === 'recurring' ? (nextDueMileage ?? null) : (dueMileage ?? null);

  return (
    <ListCard
      primary={
        <Link
          to="/vehicles/$vehicleId/reminders/$reminderId"
          params={{ vehicleId, reminderId: id }}
          className="font-display text-base font-semibold hover:underline"
        >
          {title}
        </Link>
      }
      badges={
        <>
          <Badge variant="outline">{t(`mode.${mode}`)}</Badge>
          <Badge variant={reminderStatusBadgeVariant[status] ?? 'default'}>
            {t(`status.${status}`)}
          </Badge>
          <Badge variant={reminderDueStateBadgeVariant[dueState] ?? 'outline'}>
            {t(dueStateKey(dueState))}
          </Badge>
        </>
      }
      actions={
        <>
          {status === 'pending' && (
            <MarkDoneAction
              onClick={() => {
                onMarkDone(id);
              }}
              disabled={isMarking}
              label={t('list.markDone')}
            />
          )}
          <Link
            to="/vehicles/$vehicleId/reminders/$reminderId/edit"
            params={{ vehicleId, reminderId: id }}
            aria-label={tc('actions.edit')}
            title={tc('actions.edit')}
            className={editActionClassName}
          >
            <EditActionIcon />
          </Link>
          <DeleteAction
            onClick={() => {
              onDelete(id, title);
            }}
            disabled={isDeleting}
          />
        </>
      }
    >
      <div className="px-4 pb-4 text-sm text-muted-foreground tnum">
        {displayDate ? (
          <span>
            {mode === 'recurring'
              ? t('list.nextDueDate', { date: displayDate })
              : t('list.dueDate', { date: displayDate })}
          </span>
        ) : (
          <span>{mode === 'recurring' ? t('list.noNextDueDate') : t('list.noDueDate')}</span>
        )}
        {displayMileage != null && (
          <span className="ml-4">
            {mode === 'recurring'
              ? t('list.nextDueMileage', { value: displayMileage })
              : t('list.dueMileage', { value: displayMileage })}
          </span>
        )}
      </div>
    </ListCard>
  );
}
