import {
  IssueCreateSchema,
  IssueUpdateSchema,
  ISSUE_PRIORITY_CODES,
  ISSUE_STATUS_CODES,
  type IssuePriorityCode,
  type IssueStatusCode,
} from '@carnotea/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  AppForm,
  DateField,
  FormSubmit,
  SelectField,
  TextField,
  handleApiError,
  useZodForm,
} from '@/components/form';
import type { SelectOption } from '@/components/form';
import { FormContainer } from '@/components/FormContainer';
import { PageHeader } from '@/components/PageHeader';
import { issueQueryOptions, useCreateIssue, useUpdateIssue } from '@/features/issues/queries';

// ─── Shared priority/status select options ────────────────────────────────────

function useStatusOptions(): SelectOption[] {
  const { t } = useTranslation('issues');
  return ISSUE_STATUS_CODES.map((code) => ({
    value: code,
    label: t(`status.${code}`),
  }));
}

function usePriorityOptions(): SelectOption[] {
  const { t } = useTranslation('issues');
  return ISSUE_PRIORITY_CODES.map((code) => ({
    value: code,
    label: t(`priority.${code}`),
  }));
}

// ─── Resolved-date visibility logic ───────────────────────────────────────────

function ResolvedDateField({ form }: { form: ReturnType<typeof useZodForm> }) {
  const { t } = useTranslation('issues');
  const selectedStatus = useWatch({ control: form.control, name: 'status' }) as string | undefined;
  const showResolvedDate = selectedStatus === 'resolved';

  const reportedDate = useWatch({ control: form.control, name: 'reportedDate' }) as
    | string
    | undefined;

  return (
    <>
      {showResolvedDate && (
        <DateField
          name="resolvedDate"
          label={t('fields.resolvedDate')}
          min={reportedDate ?? undefined}
        />
      )}
    </>
  );
}

// ─── Create page ───────────────────────────────────────────────────────────────

export function IssueCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/issues/new',
  });
  const { t } = useTranslation('issues');

  const createMutation = useCreateIssue(vehicleId);
  const statusOptions = useStatusOptions();
  const priorityOptions = usePriorityOptions();

  const form = useZodForm(IssueCreateSchema, {
    defaultValues: {
      reportedDate: new Date().toISOString().slice(0, 10),
      status: 'open',
      priority: 'medium',
    },
  });

  async function onSubmit(values: Record<string, unknown>) {
    try {
      await createMutation.mutateAsync(values as Parameters<typeof createMutation.mutateAsync>[0]);
    } catch (error: unknown) {
      handleApiError(error, form.setError);
    }
  }

  return (
    <FormShell
      title={t('create.title')}
      submitLabel={t('create.submit')}
      form={form}
      onSubmit={onSubmit}
      statusOptions={statusOptions}
      priorityOptions={priorityOptions}
      isEditing={false}
    />
  );
}

// ─── Edit page ─────────────────────────────────────────────────────────────────

export function IssueEditPage() {
  const { vehicleId, issueId }: { vehicleId: string; issueId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/issues/$issueId/edit',
  });
  const { t } = useTranslation('issues');

  const { data: existingIssue } = useSuspenseQuery(issueQueryOptions(vehicleId, issueId));

  const updateMutation = useUpdateIssue(vehicleId, issueId);
  const statusOptions = useStatusOptions();
  const priorityOptions = usePriorityOptions();

  const form = useZodForm(IssueUpdateSchema, {
    defaultValues: {
      title: existingIssue.title,
      description: existingIssue.description ?? undefined,
      status: existingIssue.status as IssueStatusCode,
      priority: existingIssue.priority as IssuePriorityCode,
      reportedDate: existingIssue.reportedDate,
      resolvedDate: existingIssue.resolvedDate ?? undefined,
      relatedServiceRecordId: existingIssue.relatedServiceRecordId ?? undefined,
    },
  });

  async function onSubmit(values: Record<string, unknown>) {
    try {
      await updateMutation.mutateAsync(values);
    } catch (error: unknown) {
      handleApiError(error, form.setError);
    }
  }

  return (
    <FormShell
      title={t('edit.title')}
      submitLabel={t('edit.submit')}
      form={form}
      onSubmit={onSubmit}
      statusOptions={statusOptions}
      priorityOptions={priorityOptions}
      isEditing
    />
  );
}

// ─── Shared form shell ─────────────────────────────────────────────────────────

function FormShell({
  title,
  submitLabel,
  form,
  onSubmit,
  statusOptions,
  priorityOptions,
  isEditing,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  statusOptions: SelectOption[];
  priorityOptions: SelectOption[];
  isEditing: boolean;
}) {
  const { t } = useTranslation('issues');

  return (
    <FormContainer>
      <PageHeader title={title} />

      <AppForm form={form} onSubmit={onSubmit}>
        <TextField name="title" label={t('fields.title')} placeholder={t('fields.title')} />
        <TextField
          name="description"
          label={t('fields.description')}
          placeholder={t('fields.description')}
        />
        <DateField name="reportedDate" label={t('fields.reportedDate')} disabled={isEditing} />
        <SelectField name="status" label={t('fields.status')} options={statusOptions} />
        <ResolvedDateField form={form} />
        <SelectField name="priority" label={t('fields.priority')} options={priorityOptions} />
        <FormSubmit>{submitLabel}</FormSubmit>
      </AppForm>
    </FormContainer>
  );
}
