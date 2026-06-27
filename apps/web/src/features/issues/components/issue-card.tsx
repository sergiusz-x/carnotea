import type { IssueStatusCode, IssuePriorityCode } from '@carnotea/shared';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  in_progress: 'secondary',
  resolved: 'outline',
  cancelled: 'destructive',
};

const priorityBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
  critical: 'destructive',
};

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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link
                to="/vehicles/$vehicleId/issues/$issueId"
                params={{ vehicleId, issueId: id }}
                className="font-medium hover:underline"
              >
                {title}
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusBadgeVariant[status] ?? 'default'}>
                {t(`status.${status as IssueStatusCode}`)}
              </Badge>
              <Badge variant={priorityBadgeVariant[priority] ?? 'default'}>
                {t(`priority.${priority as IssuePriorityCode}`)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <span>{t('list.reportedDate', { date: reportedDate })}</span>
              {resolvedDate && (
                <span className="ml-4">{t('list.resolvedDate', { date: resolvedDate })}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/vehicles/$vehicleId/issues/$issueId/edit"
              params={{ vehicleId, issueId: id }}
            >
              <Button variant="outline" size="sm">
                {tc('actions.edit')}
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(id, title);
              }}
              disabled={isDeleting}
            >
              {tc('actions.delete')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
