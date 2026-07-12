import { REMINDER_MODES, ReminderCreateSchema, type ReminderStatusCode } from '@carnotea/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import {
  AppForm,
  DateField,
  FormSubmit,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
  handleApiError,
  useZodForm,
} from '@/components/form';
import type { SelectOption } from '@/components/form';
import { FormContainer } from '@/components/FormContainer';
import { PageHeader } from '@/components/PageHeader';
import {
  reminderQueryOptions,
  useCreateReminder,
  useUpdateReminder,
} from '@/features/reminders/queries';

const STATUS_CODES: ReminderStatusCode[] = ['pending', 'done', 'cancelled'];

function useStatusOptions(): SelectOption[] {
  const { t } = useTranslation('reminders');
  return STATUS_CODES.map((code) => ({
    value: code,
    label: t(`status.${code}`),
  }));
}

function useModeOptions(): SelectOption[] {
  const { t } = useTranslation('reminders');
  return REMINDER_MODES.map((mode) => ({
    value: mode,
    label: t(`mode.${mode}`),
  }));
}

export function ReminderCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/reminders/new',
  });
  const { t } = useTranslation('reminders');

  const createMutation = useCreateReminder(vehicleId);
  const statusOptions = useStatusOptions();
  const modeOptions = useModeOptions();

  const form = useZodForm(ReminderCreateSchema, {
    defaultValues: {
      title: '',
      description: '',
      mode: 'one_off',
      dueDate: undefined,
      dueMileage: undefined,
      intervalKm: undefined,
      intervalMonths: undefined,
      lastPerformedDate: undefined,
      lastPerformedMileage: undefined,
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
      modeOptions={modeOptions}
      isEditing={false}
    />
  );
}

export function ReminderEditPage() {
  const { vehicleId, reminderId }: { vehicleId: string; reminderId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/reminders/$reminderId/edit',
  });
  const { t } = useTranslation('reminders');

  const { data: existingReminder } = useSuspenseQuery(reminderQueryOptions(vehicleId, reminderId));

  const updateMutation = useUpdateReminder(vehicleId, reminderId);
  const statusOptions = useStatusOptions();
  const modeOptions = useModeOptions();

  const form = useZodForm(ReminderCreateSchema, {
    defaultValues: {
      title: existingReminder.title,
      description: existingReminder.description ?? undefined,
      mode: existingReminder.mode,
      dueDate: existingReminder.dueDate ?? undefined,
      dueMileage: existingReminder.dueMileage ?? undefined,
      intervalKm: existingReminder.intervalKm ?? undefined,
      intervalMonths: existingReminder.intervalMonths ?? undefined,
      lastPerformedDate: existingReminder.lastPerformedDate ?? undefined,
      lastPerformedMileage: existingReminder.lastPerformedMileage ?? undefined,
      status: existingReminder.status,
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
      modeOptions={modeOptions}
      isEditing
    />
  );
}

function FormShell({
  title,
  submitLabel,
  form,
  onSubmit,
  statusOptions,
  modeOptions,
  isEditing,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  statusOptions: SelectOption[];
  modeOptions: SelectOption[];
  isEditing: boolean;
}) {
  const { t } = useTranslation('reminders');
  const mode = form.watch('mode') === 'recurring' ? 'recurring' : 'one_off';

  return (
    <FormContainer>
      <PageHeader title={title} />

      <AppForm form={form} onSubmit={onSubmit}>
        <TextField name="title" label={t('fields.title')} placeholder={t('fields.title')} />
        <TextareaField
          name="description"
          label={t('fields.description')}
          placeholder={t('fields.description')}
          rows={4}
        />
        <SelectField
          name="mode"
          label={t('fields.mode')}
          options={modeOptions}
          placeholder={t('fields.mode')}
        />

        {mode === 'one_off' ? (
          <>
            <DateField name="dueDate" label={t('fields.dueDate')} />
            <NumberField name="dueMileage" label={t('fields.dueMileage')} />
          </>
        ) : (
          <>
            <NumberField name="intervalKm" label={t('fields.intervalKm')} />
            <NumberField name="intervalMonths" label={t('fields.intervalMonths')} />
            <DateField name="lastPerformedDate" label={t('fields.lastPerformedDate')} />
            <NumberField name="lastPerformedMileage" label={t('fields.lastPerformedMileage')} />
          </>
        )}

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
