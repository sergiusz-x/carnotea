import { FuelLogCreateSchema, FuelLogUpdateSchema } from '@carnotea/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import {
  AppForm,
  CheckboxField,
  DateField,
  FormSubmit,
  NumberField,
  TextField,
  handleApiError,
  useZodForm,
} from '@/components/form';
import { FormContainer } from '@/components/FormContainer';
import { fuelLogQueryOptions, useCreateFuelLog, useUpdateFuelLog } from '@/features/fuel/queries';
import { useTotalCost } from '@/lib/useTotalCost';

// ─── Preview of computed totalCost ────────────────────────────────────────────

function TotalCostPreview({ form }: { form: ReturnType<typeof useZodForm> }) {
  const { t } = useTranslation('fuel-logs');
  const totalCost = useTotalCost(form, 'liters', 'pricePerLiter');
  if (totalCost === null) return null;
  return (
    <p className="text-sm text-muted-foreground">{t('totalCostPreview', { cost: totalCost })}</p>
  );
}

// ─── Create page ───────────────────────────────────────────────────────────────

export function FuelLogCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/fuel/new',
  });
  const { t } = useTranslation('fuel-logs');

  const createMutation = useCreateFuelLog(vehicleId);

  const form = useZodForm(FuelLogCreateSchema, {
    defaultValues: {
      fuelDate: new Date().toISOString().slice(0, 10),
      isFullTank: true,
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
      isEditing={false}
    />
  );
}

// ─── Edit page ─────────────────────────────────────────────────────────────────

export function FuelLogEditPage() {
  const { vehicleId, fuelId }: { vehicleId: string; fuelId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/fuel/$fuelId/edit',
  });
  const { t } = useTranslation('fuel-logs');

  const { data: existingLog } = useSuspenseQuery(fuelLogQueryOptions(vehicleId, fuelId));

  const updateMutation = useUpdateFuelLog(vehicleId, fuelId);

  const form = useZodForm(FuelLogUpdateSchema, {
    defaultValues: {
      fuelDate: existingLog.fuelDate,
      mileage: existingLog.mileage,
      liters: existingLog.liters,
      pricePerLiter: existingLog.pricePerLiter,
      stationName: existingLog.stationName ?? undefined,
      isFullTank: existingLog.isFullTank,
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
  isEditing,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  isEditing: boolean;
}) {
  const { t } = useTranslation('fuel-logs');

  return (
    <FormContainer>
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>

      <AppForm form={form} onSubmit={onSubmit}>
        <DateField name="fuelDate" label={t('fields.fuelDate')} disabled={isEditing} />
        <NumberField
          name="mileage"
          label={t('fields.mileage')}
          placeholder={t('fields.mileage')}
          min={0}
        />
        <NumberField
          name="liters"
          label={t('fields.liters')}
          placeholder={t('fields.liters')}
          min={0}
          step={0.01}
        />
        <NumberField
          name="pricePerLiter"
          label={t('fields.pricePerLiter')}
          placeholder={t('fields.pricePerLiter')}
          min={0}
          step={0.001}
        />
        <TotalCostPreview form={form} />
        <TextField
          name="stationName"
          label={t('fields.stationName')}
          placeholder={t('fields.stationName')}
        />
        <CheckboxField name="isFullTank" label={t('fields.isFullTank')} />
        <FormSubmit>{submitLabel}</FormSubmit>
      </AppForm>
    </FormContainer>
  );
}
