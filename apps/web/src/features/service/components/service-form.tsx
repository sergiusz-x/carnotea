import {
  ServiceRecordCreateSchema,
  ServiceRecordUpdateSchema,
  type ServicePartLineRequest,
} from '@carnotea/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  AppForm,
  DateField,
  FormSubmit,
  NumberField,
  TextField,
  setServerErrors,
  useZodForm,
} from '@/components/form';
import { Button } from '@/components/ui/button';
import {
  serviceRecordQueryOptions,
  useCreateServiceRecord,
  useUpdateServiceRecord,
} from '@/features/service/queries';
import type { ApiError } from '@/lib/api/client';

// ─── Total cost preview ───────────────────────────────────────────────────────

function TotalCostPreview({ form }: { form: ReturnType<typeof useZodForm> }) {
  const { t } = useTranslation('service');
  const laborCost = useWatch({ control: form.control, name: 'laborCost' }) as number | undefined;
  const parts = useWatch({ control: form.control, name: 'parts' }) as
    | ServicePartLineRequest[]
    | undefined;

  const parsedLabor = Number(laborCost);
  const partsTotal =
    parts?.reduce((sum, part) => {
      const qty = part.quantity || 0;
      const price = part.unitPrice || 0;
      return sum + qty * price;
    }, 0) ?? 0;

  const totalCost =
    !Number.isNaN(parsedLabor) && parsedLabor >= 0
      ? (parsedLabor + partsTotal).toFixed(2)
      : partsTotal > 0
        ? partsTotal.toFixed(2)
        : null;

  if (totalCost === null) return null;

  return (
    <p className="text-sm text-muted-foreground">
      {t('form.totalCostPreview', { cost: totalCost })}
    </p>
  );
}

// ─── Inline parts editor ──────────────────────────────────────────────────────

function PartsEditor({ form }: { form: ReturnType<typeof useZodForm> }) {
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

      {fields.length === 0 && <p className="text-sm text-muted-foreground">{t('list.noParts')}</p>}

      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2 rounded-md border p-3">
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
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  isEditing: boolean;
}) {
  return (
    <div className="container mx-auto max-w-screen-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>

      <AppForm form={form} onSubmit={onSubmit}>
        <DateField name="serviceDate" label="Service date" disabled={isEditing} />
        <NumberField name="mileage" label="Mileage (km)" placeholder="Mileage (km)" min={0} />
        <TextField name="title" label="Title" placeholder="Title" />
        <TextField name="description" label="Description" placeholder="Description" />
        <NumberField name="laborCost" label="Labor cost" placeholder="0.00" min={0} step={0.01} />
        <TotalCostPreview form={form} />
        <TextField name="workshopName" label="Workshop" placeholder="Workshop" />
        <PartsEditor form={form} />
        <FormSubmit>{submitLabel}</FormSubmit>
      </AppForm>
    </div>
  );
}

// ─── i18n-aware wrapper ────────────────────────────────────────────────────────

function useT() {
  return useTranslation('service');
}

// ─── Create page ───────────────────────────────────────────────────────────────

export function ServiceCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/service/new',
  });
  const { t } = useT();

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
      isEditing={false}
    />
  );
}

// ─── Edit page ─────────────────────────────────────────────────────────────────

export function ServiceEditPage() {
  const { vehicleId, recordId }: { vehicleId: string; recordId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/service/$recordId/edit',
  });
  const { t } = useT();

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
      isEditing
    />
  );
}
