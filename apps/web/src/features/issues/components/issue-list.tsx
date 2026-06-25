import { ISSUE_STATUS_CODES } from '@carnotea/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IssueCard } from '@/features/issues/components/issue-card';
import { issuesQueryOptions, useDeleteIssue } from '@/features/issues/queries';

interface IssuesSearchParams {
  status?: string;
}

export function IssueListPage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/issues',
  });
  const search: IssuesSearchParams = useSearch({
    from: '/_authenticated/vehicles/$vehicleId/issues',
  });
  const { t } = useTranslation('issues');

  const statusFilter = search.status ?? 'all';

  const {
    data: issues,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(issuesQueryOptions(vehicleId, statusFilter));

  const deleteMutation = useDeleteIssue(vehicleId);

  function handleDelete(id: string, title: string) {
    if (window.confirm(t('delete.confirmMessage', { title }))) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      deleteMutation.mutateAsync(id);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <p>{t('loading')}</p>
      </PageContainer>
    );
  }

  if (isError || !issues) {
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

  const issueList = Array.isArray(issues) ? issues : [];

  return (
    <PageContainer>
      <PageHeader
        title={t('pageTitle')}
        action={
          <Link to="/vehicles/$vehicleId/issues/new" params={{ vehicleId }}>
            <Button>{t('addIssue')}</Button>
          </Link>
        }
      />

      {/* Status filter */}
      <div className="mb-6 flex items-center gap-2">
        <Label>{t('fields.status')}</Label>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            const searchParams = new URLSearchParams(window.location.search);
            if (value && value !== 'all') {
              searchParams.set('status', value);
            } else {
              searchParams.delete('status');
            }
            const qs = searchParams.toString();
            const base = `/vehicles/${vehicleId}/issues`;
            window.location.href = qs ? `${base}?${qs}` : base;
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.all')}</SelectItem>
            {ISSUE_STATUS_CODES.map((code) => (
              <SelectItem key={code} value={code}>
                {t(`filter.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {issueList.length === 0 && (
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Link to="/vehicles/$vehicleId/issues/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          }
        />
      )}

      {/* Issue cards */}
      {issueList.length > 0 && (
        <div className="space-y-4">
          {issueList.map(
            (issue: {
              id: string;
              title: string;
              status: string;
              priority: string;
              reportedDate: string;
              resolvedDate: string | null;
            }) => (
              <IssueCard
                key={issue.id}
                id={issue.id}
                title={issue.title}
                status={issue.status}
                priority={issue.priority}
                reportedDate={issue.reportedDate}
                resolvedDate={issue.resolvedDate}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ),
          )}
        </div>
      )}
    </PageContainer>
  );
}
