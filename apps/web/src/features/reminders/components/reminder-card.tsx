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
  status: string;
  dueState: string;
  dueDate: string | null;
  dueMileage: number | null;
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
  const { t: tc } = useTranslation('common');

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
          <Badge variant={reminderStatusBadgeVariant[status] ?? 'default'}>
            {t(`status.${status as ReminderStatusCode}`)}
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
        {dueDate ? (
          <span>{t('list.dueDate', { date: dueDate })}</span>
        ) : (
          <span>{t('list.noDueDate')}</span>
        )}
        {dueMileage != null && (
          <span className="ml-4">{t('list.dueMileage', { value: dueMileage })}</span>
        )}
      </div>
    </ListCard>
  );
}
