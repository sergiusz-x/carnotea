import {
  CHARGER_TYPE_CODES,
  ChargingSessionCreateSchema,
  ChargingSessionUpdateSchema,
  type ChargerTypeCode,
} from '@carnotea/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AppForm,
  BigNumberField,
  DateField,
  SelectField,
  StepWizard,
  TextField,
  ToggleField,
  handleApiError,
  useStepForm,
  useZodForm,
} from '@/components/form';
import type { SelectOption } from '@/components/form';
import { FormContainer } from '@/components/FormContainer';
import {
  chargingSessionQueryOptions,
  useCreateChargingSession,
  useUpdateChargingSession,
} from '@/features/charging/queries';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';
import { useLastMileage } from '@/lib/useLastMileage';
import { useTotalCost } from '@/lib/useTotalCost';

// ─── Step field groups ────────────────────────────────────────────────────────

const STEP_FIELDS = [
  ['chargeDate', 'mileage', 'stationName'],
  ['energyKwh', 'pricePerKwh', 'chargerType', 'isFullCharge'],
  ['socStartPercent', 'socEndPercent'],
];

// ─── Charger type options ─────────────────────────────────────────────────────

function useChargerTypeOptions(): SelectOption[] {
  const { t } = useTranslation('charging');
  return CHARGER_TYPE_CODES.map((code) => ({
    value: code,
    label: t(`chargerType.${code}`),
  }));
}

// ─── Mini summary card shown at top of step 3 ────────────────────────────────

function ChargingSummaryCard({ form }: { form: ReturnType<typeof useZodForm> }) {
  const { t, i18n } = useTranslation('charging');
  const currency = useCurrencyPref();
  const totalCost = useTotalCost(form, 'energyKwh', 'pricePerKwh');
  const values = form.getValues() as {
    chargeDate?: string;
    mileage?: number;
    stationName?: string;
    energyKwh?: number;
    pricePerKwh?: number;
    chargerType?: ChargerTypeCode;
    isFullCharge?: boolean;
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('wizard.step2')}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {values.chargeDate && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryDate')}</dt>
            <dd className="font-medium">{values.chargeDate}</dd>
          </>
        )}
        {values.mileage != null && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryMileage')}</dt>
            <dd className="font-medium">
              {values.mileage}
              {' km'}
            </dd>
          </>
        )}
        {values.stationName && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryStation')}</dt>
            <dd className="font-medium">{values.stationName}</dd>
          </>
        )}
        {values.energyKwh != null && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryEnergy')}</dt>
            <dd className="font-medium">
              {values.energyKwh}
              {' kWh'}
            </dd>
          </>
        )}
        {values.chargerType && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryChargerType')}</dt>
            <dd className="font-medium">{t(`chargerType.${values.chargerType}`)}</dd>
          </>
        )}
        {totalCost !== null && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryCost')}</dt>
            <dd className="text-base font-bold text-primary">
              {formatMoney(Number(totalCost), currency, i18n.resolvedLanguage ?? 'en')}
            </dd>
          </>
        )}
      </dl>
    </div>
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
  defaultMileage,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  chargerTypeOptions: SelectOption[];
  isEditing: boolean;
  defaultMileage?: number;
}) {
  const { t, i18n } = useTranslation('charging');
  const currency = useCurrencyPref();
  const { currentStep, goNext, goBack } = useStepForm(form, STEP_FIELDS);
  const totalCost = useTotalCost(form, 'energyKwh', 'pricePerKwh');

  useEffect(() => {
    if (
      defaultMileage !== undefined &&
      !(form.formState.dirtyFields as Record<string, boolean>)['mileage']
    ) {
      form.setValue('mileage', defaultMileage, { shouldDirty: false });
    }
  }, [defaultMileage, form]);

  const steps = [t('wizard.step1'), t('wizard.step2'), t('wizard.step3')];

  return (
    <FormContainer>
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>

      <AppForm form={form} onSubmit={onSubmit}>
        <StepWizard
          steps={steps}
          currentStep={currentStep}
          onBack={goBack}
          onNext={goNext}
          isEditing={isEditing}
          submitLabel={submitLabel}
        >
          {currentStep === 0 && (
            <>
              <DateField name="chargeDate" label={t('fields.chargeDate')} disabled={isEditing} />
              <BigNumberField
                name="mileage"
                label={t('fields.mileage')}
                placeholder="0"
                min={0}
                step={10}
              />
              <TextField
                name="stationName"
                label={t('fields.stationName')}
                placeholder={t('fields.stationName')}
              />
            </>
          )}

          {currentStep === 1 && (
            <>
              <BigNumberField
                name="energyKwh"
                label={t('fields.energyKwh')}
                placeholder="0.00"
                min={0}
                step={0.5}
                suffix="kWh"
              />
              <BigNumberField
                name="pricePerKwh"
                label={t('fields.pricePerKwh')}
                placeholder="0.000"
                min={0}
                step={0.001}
                suffix={currency}
              />
              {totalCost !== null && (
                <div className="rounded-xl bg-primary/10 px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">{t('fields.totalCost')}</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatMoney(Number(totalCost), currency, i18n.resolvedLanguage ?? 'en')}
                  </p>
                </div>
              )}
              <SelectField
                name="chargerType"
                label={t('fields.chargerType')}
                options={chargerTypeOptions}
                placeholder={t('fields.selectChargerType')}
              />
              <ToggleField name="isFullCharge" label={t('fields.isFullCharge')} />
            </>
          )}

          {currentStep === 2 && (
            <>
              <ChargingSummaryCard form={form} />
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">{t('fields.soc')}</h3>
                <BigNumberField
                  name="socStartPercent"
                  label={t('fields.socStartPercent')}
                  placeholder="0"
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                />
                <BigNumberField
                  name="socEndPercent"
                  label={t('fields.socEndPercent')}
                  placeholder="0"
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                />
              </div>
            </>
          )}
        </StepWizard>
      </AppForm>
    </FormContainer>
  );
}

// ─── Create page ───────────────────────────────────────────────────────────────

export function ChargingCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/charging/new',
  });
  const { t } = useTranslation('charging');
  const lastMileage = useLastMileage(vehicleId);

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
      handleApiError(error, form.setError);
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
      defaultMileage={lastMileage}
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
      handleApiError(error, form.setError);
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
