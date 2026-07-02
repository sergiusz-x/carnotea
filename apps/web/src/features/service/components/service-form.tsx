import {
  ServiceRecordCreateSchema,
  ServiceRecordUpdateSchema,
  type ServicePartLineRequest,
} from '@carnotea/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  AppForm,
  BigNumberField,
  DateField,
  NumberField,
  StepWizard,
  TextareaField,
  TextField,
  handleApiError,
  useStepForm,
  useZodForm,
} from '@/components/form';
import { FormContainer } from '@/components/FormContainer';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  serviceRecordQueryOptions,
  useCreateServiceRecord,
  useUpdateServiceRecord,
} from '@/features/service/queries';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';
import { useLastMileage } from '@/lib/useLastMileage';

// ─── Step field groups ────────────────────────────────────────────────────────

const STEP_FIELDS = [
  ['serviceDate', 'mileage', 'workshopName'],
  ['title', 'description', 'laborCost'],
  [],
];

// ─── Total cost ───────────────────────────────────────────────────────────────

function useTotalServiceCost(form: ReturnType<typeof useZodForm>): number | null {
  const laborCost = useWatch({ control: form.control, name: 'laborCost' }) as number | undefined;
  const parts = useWatch({ control: form.control, name: 'parts' }) as
    | ServicePartLineRequest[]
    | undefined;

  const parsedLabor = Number(laborCost);
  const partsTotal =
    parts?.reduce((sum, part) => {
      return sum + (part.quantity || 0) * (part.unitPrice || 0);
    }, 0) ?? 0;

  if (!Number.isNaN(parsedLabor) && parsedLabor >= 0) return parsedLabor + partsTotal;
  if (partsTotal > 0) return partsTotal;
  return null;
}

// ─── Mini summary shown at top of step 3 ─────────────────────────────────────

function ServiceSummaryCard({
  form,
  currency,
}: {
  form: ReturnType<typeof useZodForm>;
  currency: string;
}) {
  const { t, i18n } = useTranslation('service');
  const total = useTotalServiceCost(form);
  const values = form.getValues() as {
    serviceDate?: string;
    mileage?: number;
    workshopName?: string;
    title?: string;
    laborCost?: number;
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('wizard.step2')}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {values.serviceDate && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryDate')}</dt>
            <dd className="font-medium">{values.serviceDate}</dd>
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
        {values.workshopName && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryWorkshop')}</dt>
            <dd className="font-medium">{values.workshopName}</dd>
          </>
        )}
        {values.title && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryTitle')}</dt>
            <dd className="font-medium">{values.title}</dd>
          </>
        )}
        {values.laborCost != null && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryLabor')}</dt>
            <dd className="font-medium">{formatMoney(values.laborCost, currency, 'en')}</dd>
          </>
        )}
        {total !== null && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryCost')}</dt>
            <dd className="text-base font-bold text-primary">
              {formatMoney(total, currency, i18n.resolvedLanguage ?? 'en')}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}

// ─── Inline parts editor ──────────────────────────────────────────────────────

function PartsEditor({
  form,
  currency,
}: {
  form: ReturnType<typeof useZodForm>;
  currency: string;
}) {
  const { t } = useTranslation('service');

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'parts' as const,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('fields.parts')}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            append({
              name: '',
              manufacturer: undefined,
              partNumber: undefined,
              quantity: 1,
              unitPrice: 0,
            });
          }}
        >
          {t('form.addPart')}
        </Button>
      </div>

      {fields.length === 0 && <p className="text-sm text-muted-foreground">{t('form.noParts')}</p>}

      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2 rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t('form.partIndex', { index: index + 1 })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                remove(index);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextField
              name={`parts.${String(index)}.name` as const}
              label={t('fields.partName')}
              placeholder={t('fields.partName')}
            />
            <TextField
              name={`parts.${String(index)}.manufacturer` as const}
              label={t('fields.manufacturer')}
              placeholder={t('fields.manufacturer')}
            />
            <TextField
              name={`parts.${String(index)}.partNumber` as const}
              label={t('fields.partNumber')}
              placeholder={t('fields.partNumber')}
            />
            <NumberField
              name={`parts.${String(index)}.quantity` as const}
              label={t('fields.quantity')}
              placeholder="1"
              min={0}
              step={0.01}
            />
            <NumberField
              name={`parts.${String(index)}.unitPrice` as const}
              label={t('fields.unitPrice')}
              placeholder="0.00"
              min={0}
              step={0.01}
              suffix={currency}
            />
          </div>
        </div>
      ))}
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
  const { t, i18n } = useTranslation('service');
  const currency = useCurrencyPref();
  const { currentStep, goNext, goBack } = useStepForm(form, STEP_FIELDS);
  const total = useTotalServiceCost(form);

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
              <DateField name="serviceDate" label={t('fields.serviceDate')} disabled={isEditing} />
              <BigNumberField
                name="mileage"
                label={t('fields.mileage')}
                placeholder="0"
                min={0}
                step={10}
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
              <TextField name="title" label={t('fields.title')} placeholder={t('fields.title')} />
              <TextareaField
                name="description"
                label={t('fields.description')}
                placeholder={t('fields.description')}
                rows={4}
              />
              <BigNumberField
                name="laborCost"
                label={t('fields.laborCost')}
                placeholder="0.00"
                min={0}
                step={10}
                suffix={currency}
              />
              {total !== null && (
                <div className="rounded-xl bg-primary/10 px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground">{t('fields.totalCost')}</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatMoney(total, currency, i18n.resolvedLanguage ?? 'en')}
                  </p>
                </div>
              )}
            </>
          )}

          {currentStep === 2 && (
            <>
              <ServiceSummaryCard form={form} currency={currency} />
              <PartsEditor form={form} currency={currency} />
            </>
          )}
        </StepWizard>
      </AppForm>
    </FormContainer>
  );
}

// ─── Create page ───────────────────────────────────────────────────────────────

export function ServiceCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/service/new',
  });
  const { t } = useTranslation('service');
  const lastMileage = useLastMileage(vehicleId);

  const createMutation = useCreateServiceRecord(vehicleId);

  const form = useZodForm(ServiceRecordCreateSchema, {
    defaultValues: {
      serviceDate: new Date().toISOString().slice(0, 10),
      laborCost: 0,
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

export function ServiceEditPage() {
  const { vehicleId, recordId }: { vehicleId: string; recordId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/service/$recordId/edit',
  });
  const { t } = useTranslation('service');

  const { data: existingRecord } = useSuspenseQuery(serviceRecordQueryOptions(vehicleId, recordId));

  const updateMutation = useUpdateServiceRecord(vehicleId, recordId);

  const form = useZodForm(ServiceRecordUpdateSchema, {
    defaultValues: {
      serviceDate: existingRecord.serviceDate,
      mileage: existingRecord.mileage,
      title: existingRecord.title,
      description: existingRecord.description ?? undefined,
      laborCost: existingRecord.laborCost,
      workshopName: existingRecord.workshopName ?? undefined,
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
