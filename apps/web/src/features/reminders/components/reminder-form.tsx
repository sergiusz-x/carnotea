import {
  ReminderCreateSchema,
  ReminderUpdateSchema,
  REMINDER_STATUS_CODES,
  type ReminderStatusCode,
} from '@carnotea/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import {
  AppForm,
  DateField,
  FormSubmit,
  NumberField,
  SelectField,
  TextField,
  handleApiError,
  useZodForm,
} from '@/components/form';
import type { SelectOption } from '@/components/form';
import { FormContainer } from '@/components/FormContainer';
import {
  reminderQueryOptions,
  useCreateReminder,
  useUpdateReminder,
} from '@/features/reminders/queries';

// ─── Shared status select options ────────────────────────────────────────────

function useStatusOptions(): SelectOption[] {
  const { t } = useTranslation('reminders');
  return REMINDER_STATUS_CODES.map((code) => ({
    value: code,
    label: t(`status.${code}`),
  }));
}

// ─── Create page ───────────────────────────────────────────────────────────────

export function ReminderCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/reminders/new',
  });
  const { t } = useTranslation('reminders');

  const createMutation = useCreateReminder(vehicleId);
  const statusOptions = useStatusOptions();

  const form = useZodForm(ReminderCreateSchema, {
    defaultValues: {
      title: '',
      description: '',
      dueDate: undefined,
      dueMileage: undefined,
      status: 'pending',
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
      isEditing={false}
    />
  );
}

// ─── Edit page ─────────────────────────────────────────────────────────────────

export function ReminderEditPage() {
  const { vehicleId, reminderId }: { vehicleId: string; reminderId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/reminders/$reminderId/edit',
  });
  const { t } = useTranslation('reminders');

  const { data: existingReminder } = useSuspenseQuery(reminderQueryOptions(vehicleId, reminderId));

  const updateMutation = useUpdateReminder(vehicleId, reminderId);
  const statusOptions = useStatusOptions();

  const form = useZodForm(ReminderUpdateSchema, {
    defaultValues: {
      title: existingReminder.title,
      description: existingReminder.description ?? undefined,
      status: existingReminder.status as ReminderStatusCode,
      dueDate: existingReminder.dueDate ?? undefined,
      dueMileage: existingReminder.dueMileage ?? undefined,
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
  isEditing,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  statusOptions: SelectOption[];
  isEditing: boolean;
}) {
  const { t } = useTranslation('reminders');

  return (
    <FormContainer>
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>

      <AppForm form={form} onSubmit={onSubmit}>
        <TextField name="title" label={t('fields.title')} placeholder={t('fields.title')} />
        <TextField
          name="description"
          label={t('fields.description')}
          placeholder={t('fields.description')}
        />
        <DateField name="dueDate" label={t('fields.dueDate')} />
        <NumberField name="dueMileage" label={t('fields.dueMileage')} />
        <SelectField
          name="status"
          label={t('fields.status')}
          options={statusOptions}
          disabled={isEditing}
        />
        <FormSubmit>{submitLabel}</FormSubmit>
      </AppForm>
    </FormContainer>
  );
}
