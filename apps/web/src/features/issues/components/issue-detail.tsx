import type { IssueStatusCode, IssuePriorityCode } from '@carnotea/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { issueQueryOptions, useDeleteIssue } from '@/features/issues/queries';

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

export function IssueDetailPage() {
  const { vehicleId, issueId }: { vehicleId: string; issueId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/issues/$issueId',
  });
  const { t } = useTranslation('issues');

  const {
    data: issue,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(issueQueryOptions(vehicleId, issueId));

  const deleteMutation = useDeleteIssue(vehicleId);

  function handleDelete() {
    if (!issue) return;
    if (window.confirm(t('delete.confirmMessage', { title: issue.title }))) {
      void deleteMutation.mutateAsync(issueId);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (isError || !issue) {
    return (
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <div className="space-y-4">
          <p>{t('error.load')}</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void refetch();
            }}
          >
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
          <Link
            to="/vehicles/$vehicleId/issues"
            params={{ vehicleId }}
            className="text-sm text-muted-foreground hover:underline"
          >
            {t('detail.backToIssues')}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {t('detail.title', { title: issue.title })}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/vehicles/$vehicleId/issues/$issueId/edit"
            params={{ vehicleId, issueId }}
          >
            <Button variant="outline">{t('edit.submit')}</Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {t('delete.confirm')}
          </Button>
        </div>
      </div>

      {/* Badges */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={statusBadgeVariant[issue.status] ?? 'default'}>
          {t(`status.${issue.status as IssueStatusCode}`)}
        </Badge>
        <Badge variant={priorityBadgeVariant[issue.priority] ?? 'default'}>
          {t(`priority.${issue.priority as IssuePriorityCode}`)}
        </Badge>
      </div>

      {/* Detail card */}
      <Card>
        <CardHeader>
          <CardTitle>{issue.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">{t('fields.reportedDate')}</dt>
            <dd>{issue.reportedDate}</dd>

            {issue.resolvedDate && (
              <>
                <dt className="text-muted-foreground">{t('fields.resolvedDate')}</dt>
                <dd>{issue.resolvedDate}</dd>
              </>
            )}

            <dt className="text-muted-foreground">{t('fields.priority')}</dt>
            <dd>{t(`priority.${issue.priority as IssuePriorityCode}`)}</dd>

            <dt className="text-muted-foreground">{t('fields.status')}</dt>
            <dd>{t(`status.${issue.status as IssueStatusCode}`)}</dd>

            {issue.description && (
              <>
                <dt className="text-muted-foreground">{t('detail.description')}</dt>
                <dd className="col-span-2 whitespace-pre-wrap">{issue.description}</dd>
              </>
            )}

            <dt className="text-muted-foreground">{t('detail.relatedRecord')}</dt>
            <dd>
              {issue.relatedServiceRecordId ? (
                <a
                  href={`/vehicles/${vehicleId}/service/${issue.relatedServiceRecordId}`}
                  className="text-primary hover:underline"
                >
                  {issue.relatedServiceRecordId}
                </a>
              ) : (
                <span className="text-muted-foreground">{t('detail.noRelatedRecord')}</span>
              )}
            </dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}