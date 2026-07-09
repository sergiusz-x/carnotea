import {
  FLUID_TYPE_CODES,
  FluidLogCreateSchema,
  FluidLogUpdateSchema,
  type FluidTypeCode,
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
  TextareaField,
  TextField,
  handleApiError,
  useStepForm,
  useZodForm,
} from '@/components/form';
import type { SelectOption } from '@/components/form';
import { FormContainer } from '@/components/FormContainer';
import { PageHeader } from '@/components/PageHeader';
import {
  fluidLogQueryOptions,
  useCreateFluidLog,
  useUpdateFluidLog,
} from '@/features/fluid-logs/queries';
import { useCurrencyPref } from '@/lib/useCurrencyPref';
import { useLastMileage } from '@/lib/useLastMileage';

// ─── Step field groups ────────────────────────────────────────────────────────

const STEP_FIELDS = [
  ['changeDate', 'mileage', 'fluidType', 'workshopName'],
  ['quantityLiters', 'cost', 'intervalKm', 'intervalMonths', 'notes'],
];

// ─── Fluid type options ────────────────────────────────────────────────────────

function useFluidTypeOptions(): SelectOption[] {
  const { t } = useTranslation('fluid-logs');
  return FLUID_TYPE_CODES.map((code) => ({
    value: code,
    label: t(`fluidType.${code}`),
  }));
}

// ─── Mini summary card shown at top of step 2 ────────────────────────────────

function FluidLogSummaryCard({ form }: { form: ReturnType<typeof useZodForm> }) {
  const { t } = useTranslation('fluid-logs');
  const currency = useCurrencyPref();
  const values = form.getValues() as {
    changeDate?: string;
    mileage?: number;
    fluidType?: FluidTypeCode;
    workshopName?: string;
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('wizard.step1')}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {values.changeDate && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryDate')}</dt>
            <dd className="font-medium">{values.changeDate}</dd>
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
        {values.fluidType && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryFluidType')}</dt>
            <dd className="font-medium">{t(`fluidType.${values.fluidType}`)}</dd>
          </>
        )}
        {values.workshopName && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryWorkshop')}</dt>
            <dd className="font-medium">{values.workshopName}</dd>
          </>
        )}
      </dl>
      <p className="text-xs text-muted-foreground">{t('wizard.summaryHint', { currency })}</p>
    </div>
  );
}

// ─── Shared form shell ─────────────────────────────────────────────────────────

function FormShell({
  title,
  submitLabel,
  form,
  onSubmit,
  fluidTypeOptions,
  isEditing,
  defaultMileage,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  fluidTypeOptions: SelectOption[];
  isEditing: boolean;
  defaultMileage?: number;
}) {
  const { t } = useTranslation('fluid-logs');
  const currency = useCurrencyPref();
  const { currentStep, goNext, goBack } = useStepForm(form, STEP_FIELDS);

  useEffect(() => {
    if (
      defaultMileage !== undefined &&
      !(form.formState.dirtyFields as Record<string, boolean>)['mileage']
    ) {
      form.setValue('mileage', defaultMileage, { shouldDirty: false });
    }
  }, [defaultMileage, form]);

  const steps = [t('wizard.step1'), t('wizard.step2')];

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
              <DateField name="changeDate" label={t('fields.changeDate')} />
              <BigNumberField
                name="mileage"
                label={t('fields.mileage')}
                placeholder="0"
                min={0}
                step={10}
              />
              <SelectField
                name="fluidType"
                label={t('fields.fluidType')}
                options={fluidTypeOptions}
                placeholder={t('fields.selectFluidType')}
              />
              <TextField
                name="workshopName"
                label={t('fields.workshopName')}
                placeholder={t('fields.workshopName')}
              />
            </>
          )}

          {currentStep === 1 && (
            <>
              <FluidLogSummaryCard form={form} />
              <BigNumberField
                name="quantityLiters"
                label={t('fields.quantityLiters')}
                placeholder="0.00"
                min={0}
                step={0.1}
                suffix="L"
              />
              <BigNumberField
                name="cost"
                label={t('fields.cost')}
                placeholder="0.00"
                min={0}
                step={0.01}
                suffix={currency}
              />
              <BigNumberField
                name="intervalKm"
                label={t('fields.intervalKm')}
                placeholder="0"
                min={0}
                step={1000}
                suffix="km"
              />
              <BigNumberField
                name="intervalMonths"
                label={t('fields.intervalMonths')}
                placeholder="0"
                min={0}
                step={1}
                suffix={t('fields.months')}
              />
              <TextareaField
                name="notes"
                label={t('fields.notes')}
                placeholder={t('fields.notes')}
              />
            </>
          )}
        </StepWizard>
      </AppForm>
    </FormContainer>
  );
}

// ─── Create page ───────────────────────────────────────────────────────────────

export function FluidLogCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/fluid-logs/new',
  });
  const { t } = useTranslation('fluid-logs');
  const lastMileage = useLastMileage(vehicleId);

  const createMutation = useCreateFluidLog(vehicleId);
  const fluidTypeOptions = useFluidTypeOptions();

  const form = useZodForm(FluidLogCreateSchema, {
    defaultValues: {
      changeDate: new Date().toISOString().slice(0, 10),
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
      fluidTypeOptions={fluidTypeOptions}
      isEditing={false}
      defaultMileage={lastMileage}
    />
  );
}

// ─── Edit page ─────────────────────────────────────────────────────────────────

export function FluidLogEditPage() {
  const { vehicleId, logId }: { vehicleId: string; logId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/fluid-logs/$logId/edit',
  });
  const { t } = useTranslation('fluid-logs');

  const { data: existingLog } = useSuspenseQuery(fluidLogQueryOptions(vehicleId, logId));

  const updateMutation = useUpdateFluidLog(vehicleId, logId);
  const fluidTypeOptions = useFluidTypeOptions();

  const form = useZodForm(FluidLogUpdateSchema, {
    defaultValues: {
      changeDate: existingLog.changeDate,
      mileage: existingLog.mileage,
      fluidType: existingLog.fluidType as FluidTypeCode,
      quantityLiters: existingLog.quantityLiters ?? undefined,
      cost: existingLog.cost ?? undefined,
      intervalKm: existingLog.intervalKm ?? undefined,
      intervalMonths: existingLog.intervalMonths ?? undefined,
      workshopName: existingLog.workshopName ?? undefined,
      notes: existingLog.notes ?? undefined,
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
      fluidTypeOptions={fluidTypeOptions}
      isEditing
    />
  );
}
