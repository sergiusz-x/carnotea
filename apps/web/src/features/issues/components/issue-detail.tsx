import type { IssueStatusCode, IssuePriorityCode } from '@carnotea/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '@/components/ErrorState';
import { ListCard } from '@/components/ListCard';
import { DeleteAction, EditActionIcon, editActionClassName } from '@/components/ListCardActions';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import {
  issuePriorityBadgeVariant,
  issueStatusBadgeVariant,
} from '@/features/issues/badge-variants';
import { issueQueryOptions, useDeleteIssue } from '@/features/issues/queries';

export function IssueDetailPage() {
  const { vehicleId, issueId }: { vehicleId: string; issueId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/issues/$issueId',
  });
  const { t } = useTranslation('issues');
  const { t: tc } = useTranslation('common');

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
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !issue) {
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
      <Link
        to="/vehicles/$vehicleId/issues"
        params={{ vehicleId }}
        className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        {t('detail.backToIssues')}
      </Link>

      <PageHeader
        title={t('detail.title', { title: issue.title })}
        action={
          <div className="flex items-center gap-1">
            <Link
              to="/vehicles/$vehicleId/issues/$issueId/edit"
              params={{ vehicleId, issueId }}
              aria-label={tc('actions.edit')}
              title={tc('actions.edit')}
              className={editActionClassName}
            >
              <EditActionIcon />
            </Link>
            <DeleteAction onClick={handleDelete} disabled={deleteMutation.isPending} />
          </div>
        }
      />

      <ListCard
        primary={<span className="font-display text-base font-semibold">{issue.title}</span>}
        badges={
          <>
            <Badge variant={issueStatusBadgeVariant[issue.status] ?? 'default'}>
              {t(`status.${issue.status as IssueStatusCode}`)}
            </Badge>
            <Badge variant={issuePriorityBadgeVariant[issue.priority] ?? 'default'}>
              {t(`priority.${issue.priority as IssuePriorityCode}`)}
            </Badge>
          </>
        }
      >
        <dl className="divide-y border-t px-4 text-sm">
          <div className="flex justify-between py-2.5">
            <dt className="text-muted-foreground">{t('fields.reportedDate')}</dt>
            <dd className="font-medium">{issue.reportedDate}</dd>
          </div>

          {issue.resolvedDate && (
            <div className="flex justify-between py-2.5">
              <dt className="text-muted-foreground">{t('fields.resolvedDate')}</dt>
              <dd className="font-medium">{issue.resolvedDate}</dd>
            </div>
          )}

          {issue.description && (
            <div className="py-2.5">
              <dt className="text-muted-foreground">{t('detail.description')}</dt>
              <dd className="mt-1 whitespace-pre-wrap">{issue.description}</dd>
            </div>
          )}

          <div className="flex items-center justify-between py-2.5">
            <dt className="text-muted-foreground">{t('detail.relatedRecord')}</dt>
            <dd>
              {issue.relatedServiceRecordId ? (
                <Link
                  to="/vehicles/$vehicleId/service/$recordId/edit"
                  params={{ vehicleId, recordId: issue.relatedServiceRecordId }}
                  className="font-medium text-primary hover:underline"
                >
                  {issue.relatedServiceRecordId}
                </Link>
              ) : (
                <span className="text-muted-foreground">{t('detail.noRelatedRecord')}</span>
              )}
            </dd>
          </div>
        </dl>
      </ListCard>
    </PageContainer>
  );
}
