import type { IssueStatusCode, IssuePriorityCode } from '@carnotea/shared';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ListCard } from '@/components/ListCard';
import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { Badge } from '@/components/ui/badge';
import {
  issuePriorityBadgeVariant,
  issueStatusBadgeVariant,
} from '@/features/issues/badge-variants';

interface IssueCardProps {
  id: string;
  title: string;
  status: string;
  priority: string;
  reportedDate: string;
  resolvedDate: string | null;
  onDelete: (id: string, title: string) => void;
  isDeleting: boolean;
}

export function IssueCard({
  id,
  title,
  status,
  priority,
  reportedDate,
  resolvedDate,
  onDelete,
  isDeleting,
}: IssueCardProps) {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/issues',
  });
  const { t } = useTranslation('issues');
  const { t: tc } = useTranslation('common');

  return (
    <ListCard
      primary={
        <Link
          to="/vehicles/$vehicleId/issues/$issueId"
          params={{ vehicleId, issueId: id }}
          className="font-display text-base font-semibold hover:underline"
        >
          {title}
        </Link>
      }
      badges={
        <>
          <Badge variant={issueStatusBadgeVariant[status] ?? 'default'}>
            {t(`status.${status as IssueStatusCode}`)}
          </Badge>
          <Badge variant={issuePriorityBadgeVariant[priority] ?? 'default'}>
            {t(`priority.${priority as IssuePriorityCode}`)}
          </Badge>
        </>
      }
      actions={
        <>
          <Link
            to="/vehicles/$vehicleId/issues/$issueId/edit"
            params={{ vehicleId, issueId: id }}
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
        <span>{t('list.reportedDate', { date: reportedDate })}</span>
        {resolvedDate && (
          <span className="ml-4">{t('list.resolvedDate', { date: resolvedDate })}</span>
        )}
      </div>
    </ListCard>
  );
}
