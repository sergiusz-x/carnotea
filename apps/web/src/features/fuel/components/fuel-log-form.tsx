import { FuelLogCreateSchema, FuelLogUpdateSchema } from '@carnotea/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AppForm,
  BigNumberField,
  DateField,
  StepWizard,
  TextField,
  ToggleField,
  handleApiError,
  useStepForm,
  useZodForm,
} from '@/components/form';
import { FormContainer } from '@/components/FormContainer';
import { PageHeader } from '@/components/PageHeader';
import { fuelLogQueryOptions, useCreateFuelLog, useUpdateFuelLog } from '@/features/fuel/queries';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';
import { useLastMileage } from '@/lib/useLastMileage';
import { useTotalCost } from '@/lib/useTotalCost';

// ─── Step field groups ────────────────────────────────────────────────────────

const STEP_FIELDS = [
  ['fuelDate', 'mileage', 'stationName'],
  ['liters', 'pricePerLiter', 'isFullTank'],
  [],
];

// ─── Summary (step 3) ─────────────────────────────────────────────────────────

function FuelLogSummary({ form }: { form: ReturnType<typeof useZodForm> }) {
  const { t, i18n } = useTranslation('fuel-logs');
  const currency = useCurrencyPref();
  const totalCost = useTotalCost(form, 'liters', 'pricePerLiter');
  const values = form.getValues() as {
    fuelDate?: string;
    mileage?: number;
    stationName?: string;
    liters?: number;
    pricePerLiter?: number;
    isFullTank?: boolean;
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('wizard.step3')}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {values.fuelDate && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryDate')}</dt>
            <dd className="font-medium">{values.fuelDate}</dd>
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
        {values.liters != null && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryLiters')}</dt>
            <dd className="font-medium">
              {values.liters}
              {' L'}
            </dd>
          </>
        )}
        {values.pricePerLiter != null && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryPrice')}</dt>
            <dd className="font-medium">
              {values.pricePerLiter} {currency}
              {'/L'}
            </dd>
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
        {values.isFullTank && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryFullTank')}</dt>
            <dd className="font-medium">{'✓'}</dd>
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
  isEditing,
  defaultMileage,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  isEditing: boolean;
  defaultMileage?: number;
}) {
  const { t, i18n } = useTranslation('fuel-logs');
  const currency = useCurrencyPref();
  const { currentStep, goNext, goBack } = useStepForm(form, STEP_FIELDS);
  const totalCost = useTotalCost(form, 'liters', 'pricePerLiter');

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
      <PageHeader title={title} />

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
              <DateField name="fuelDate" label={t('fields.fuelDate')} disabled={isEditing} />
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
                name="liters"
                label={t('fields.liters')}
                placeholder="0.00"
                min={0}
                step={0.5}
                suffix="L"
              />
              <BigNumberField
                name="pricePerLiter"
                label={t('fields.pricePerLiter')}
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
              <ToggleField name="isFullTank" label={t('fields.isFullTank')} />
            </>
          )}

          {currentStep === 2 && <FuelLogSummary form={form} />}
        </StepWizard>
      </AppForm>
    </FormContainer>
  );
}

// ─── Create page ───────────────────────────────────────────────────────────────

export function FuelLogCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/fuel/new',
  });
  const { t } = useTranslation('fuel-logs');
  const lastMileage = useLastMileage(vehicleId);

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
      defaultMileage={lastMileage}
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
