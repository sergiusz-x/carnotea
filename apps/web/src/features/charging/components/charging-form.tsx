import {
  CHARGER_TYPE_CODES,
  ChargingSessionCreateSchema,
  ChargingSessionUpdateSchema,
  type ChargerTypeCode,
} from '@carnotea/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  AppForm,
  CheckboxField,
  DateField,
  FormSubmit,
  NumberField,
  SelectField,
  TextField,
  setServerErrors,
  useZodForm,
} from '@/components/form';
import type { SelectOption } from '@/components/form';
import {
  chargingSessionQueryOptions,
  useCreateChargingSession,
  useUpdateChargingSession,
} from '@/features/charging/queries';
import type { ApiError } from '@/lib/api/client';

// ─── Charger type select options ──────────────────────────────────────────────

function useChargerTypeOptions(): SelectOption[] {
  const { t } = useTranslation('charging');
  return CHARGER_TYPE_CODES.map((code) => ({
    value: code,
    label: t(`chargerType.${code}`),
  }));
}

// ─── Preview of computed totalCost ────────────────────────────────────────────

function TotalCostPreview({ form }: { form: ReturnType<typeof useZodForm> }) {
  const { t } = useTranslation('charging');
  const energyKwh = useWatch({ control: form.control, name: 'energyKwh' }) as number | undefined;
  const pricePerKwh = useWatch({
    control: form.control,
    name: 'pricePerKwh',
  }) as number | undefined;

  const parsedEnergy = Number(energyKwh);
  const parsedPrice = Number(pricePerKwh);
  const totalCost =
    !Number.isNaN(parsedEnergy) && !Number.isNaN(parsedPrice) && parsedEnergy > 0 && parsedPrice > 0
      ? (parsedEnergy * parsedPrice).toFixed(2)
      : null;

  if (totalCost === null) return null;

  return (
    <p className="text-sm text-muted-foreground">{t('totalCostPreview', { cost: totalCost })}</p>
  );
}

// ─── Create page ───────────────────────────────────────────────────────────────

export function ChargingCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/charging/new',
  });
  const { t } = useTranslation('charging');

  const createMutation = useCreateChargingSession(vehicleId);
  const chargerTypeOptions = useChargerTypeOptions();

  const form = useZodForm(ChargingSessionCreateSchema, {
    defaultValues: {
      chargeDate: new Date().toISOString().slice(0, 10),
      isFullCharge: true,
    },
  });

  async function onSubmit(values: Record<string, unknown>) {
    try {
      await createMutation.mutateAsync(values as Parameters<typeof createMutation.mutateAsync>[0]);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.issues?.length) {
        setServerErrors(form.setError, {
          code: apiError.code,
          message: apiError.message,
          issues: apiError.issues,
        });
      } else {
        form.setError('root', { message: apiError.message });
      }
    }
  }

  return (
    <FormShell
      title={t('create.title')}
      submitLabel={t('create.submit')}
      form={form}
      onSubmit={onSubmit}
      chargerTypeOptions={chargerTypeOptions}
      isEditing={false}
    />
  );
}

// ─── Edit page ─────────────────────────────────────────────────────────────────

export function ChargingEditPage() {
  const { vehicleId, sessionId }: { vehicleId: string; sessionId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/charging/$sessionId/edit',
  });
  const { t } = useTranslation('charging');

  const { data: existingSession } = useSuspenseQuery(
    chargingSessionQueryOptions(vehicleId, sessionId),
  );

  const updateMutation = useUpdateChargingSession(vehicleId, sessionId);
  const chargerTypeOptions = useChargerTypeOptions();

  const form = useZodForm(ChargingSessionUpdateSchema, {
    defaultValues: {
      chargeDate: existingSession.chargeDate,
      mileage: existingSession.mileage,
      energyKwh: existingSession.energyKwh,
      pricePerKwh: existingSession.pricePerKwh,
      chargerType: existingSession.chargerType as ChargerTypeCode,
      socStartPercent: existingSession.socStartPercent ?? undefined,
      socEndPercent: existingSession.socEndPercent ?? undefined,
      stationName: existingSession.stationName ?? undefined,
      isFullCharge: existingSession.isFullCharge,
    },
  });

  async function onSubmit(values: Record<string, unknown>) {
    try {
      await updateMutation.mutateAsync(values);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      if (apiError.issues?.length) {
        setServerErrors(form.setError, {
          code: apiError.code,
          message: apiError.message,
          issues: apiError.issues,
        });
      } else {
        form.setError('root', { message: apiError.message });
      }
    }
  }

  return (
    <FormShell
      title={t('edit.title')}
      submitLabel={t('edit.submit')}
      form={form}
      onSubmit={onSubmit}
      chargerTypeOptions={chargerTypeOptions}
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
  chargerTypeOptions,
  isEditing,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  chargerTypeOptions: SelectOption[];
  isEditing: boolean;
}) {
  const { t } = useTranslation('charging');

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>

      <AppForm form={form} onSubmit={onSubmit}>
        <DateField name="chargeDate" label={t('fields.chargeDate')} disabled={isEditing} />
        <NumberField
          name="mileage"
          label={t('fields.mileage')}
          placeholder={t('fields.mileage')}
          min={0}
        />
        <NumberField
          name="energyKwh"
          label={t('fields.energyKwh')}
          placeholder={t('fields.energyKwh')}
          min={0}
          step={0.01}
        />
        <NumberField
          name="pricePerKwh"
          label={t('fields.pricePerKwh')}
          placeholder={t('fields.pricePerKwh')}
          min={0}
          step={0.001}
        />
        <TotalCostPreview form={form} />
        <SelectField
          name="chargerType"
          label={t('fields.chargerType')}
          options={chargerTypeOptions}
          placeholder={t('fields.selectChargerType')}
        />
        <NumberField
          name="socStartPercent"
          label={t('fields.socStartPercent')}
          placeholder={t('fields.socStartPercent')}
          min={0}
          max={100}
        />
        <NumberField
          name="socEndPercent"
          label={t('fields.socEndPercent')}
          placeholder={t('fields.socEndPercent')}
          min={0}
          max={100}
        />
        <TextField
          name="stationName"
          label={t('fields.stationName')}
          placeholder={t('fields.stationName')}
        />
        <CheckboxField name="isFullCharge" label={t('fields.isFullCharge')} />
        <FormSubmit>{submitLabel}</FormSubmit>
      </AppForm>
    </div>
  );
}