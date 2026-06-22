import { ISSUE_STATUS_CODES } from '@carnotea/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (isError || !issues) {
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

  const issueList = Array.isArray(issues) ? issues : [];

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
        <Link to="/vehicles/$vehicleId/issues/new" params={{ vehicleId }}>
          <Button>{t('addIssue')}</Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="mb-6 flex items-center gap-2">
        <label className="text-sm font-medium">{t('fields.status')}</label>
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

      {/* Empty state */}
      {issueList.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('empty.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{t('empty.description')}</p>
            <Link to="/vehicles/$vehicleId/issues/new" params={{ vehicleId }}>
              <Button>{t('empty.cta')}</Button>
            </Link>
          </CardContent>
        </Card>
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
    </div>
  );
}