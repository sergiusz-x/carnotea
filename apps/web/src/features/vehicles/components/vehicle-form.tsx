import { FUEL_TYPE_CODES, VehicleCreateSchema, VehicleUpdateSchema } from '@carnotea/shared';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import {
  AppForm,
  FormSubmit,
  NumberField,
  SelectField,
  TextField,
  setServerErrors,
  useZodForm,
} from '@/components/form';
import {
  useCreateVehicle,
  useUpdateVehicle,
  vehicleQueryOptions,
} from '@/features/vehicles/queries';
import type { ApiError } from '@/lib/api/client';

const CURRENCY_OPTIONS = [
  { value: 'PLN', label: 'PLN' },
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CHF', label: 'CHF' },
];

function normalizeVehicleValues(values: Record<string, unknown>) {
  const normalized = { ...values };
  for (const key of ['generation', 'engine', 'vin', 'registrationNumber'] as const) {
    if (normalized[key] === '') {
      normalized[key] = undefined;
    }
  }
  return normalized;
}

function useFuelTypeOptions() {
  const { t } = useTranslation('vehicles');
  return FUEL_TYPE_CODES.map((code) => ({
    value: code,
    label: t(`fuelTypes.${code}` as const),
  }));
}

export function VehicleCreatePage() {
  const { t } = useTranslation('vehicles');
  const fuelTypeOptions = useFuelTypeOptions();
  const createMutation = useCreateVehicle();

  const form = useZodForm(VehicleCreateSchema, {
    defaultValues: {
      currencyCode: 'EUR',
    },
  });

  async function onSubmit(values: Record<string, unknown>) {
    try {
      await createMutation.mutateAsync(
        normalizeVehicleValues(values) as Parameters<typeof createMutation.mutateAsync>[0],
      );
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
      fuelTypeOptions={fuelTypeOptions}
    />
  );
}

export function VehicleEditPage() {
  const { vehicleId } = useParams({ from: '/_authenticated/vehicles/$vehicleId/edit' });
  const { t } = useTranslation('vehicles');
  const fuelTypeOptions = useFuelTypeOptions();
  const { data: existingVehicle } = useSuspenseQuery(vehicleQueryOptions(vehicleId));
  const updateMutation = useUpdateVehicle(vehicleId);

  const form = useZodForm(VehicleUpdateSchema, {
    defaultValues: {
      brand: existingVehicle.brand,
      model: existingVehicle.model,
      generation: existingVehicle.generation ?? undefined,
      productionYear: existingVehicle.productionYear,
      engine: existingVehicle.engine ?? undefined,
      fuelType: existingVehicle.fuelType,
      vin: existingVehicle.vin ?? undefined,
      registrationNumber: existingVehicle.registrationNumber ?? undefined,
      currencyCode: existingVehicle.currencyCode,
    },
  });

  async function onSubmit(values: Record<string, unknown>) {
    try {
      await updateMutation.mutateAsync(normalizeVehicleValues(values));
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
      fuelTypeOptions={fuelTypeOptions}
    />
  );
}

function FormShell({
  title,
  submitLabel,
  form,
  onSubmit,
  fuelTypeOptions,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  fuelTypeOptions: { value: string; label: string }[];
}) {
  const { t } = useTranslation('vehicles');

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>

      <AppForm form={form} onSubmit={onSubmit}>
        <TextField name="brand" label={t('fields.brand')} placeholder={t('fields.brand')} />
        <TextField name="model" label={t('fields.model')} placeholder={t('fields.model')} />
        <TextField
          name="generation"
          label={t('fields.generation')}
          placeholder={t('fields.generation')}
        />
        <NumberField
          name="productionYear"
          label={t('fields.productionYear')}
          placeholder={t('fields.productionYear')}
          min={1950}
          max={new Date().getFullYear() + 1}
        />
        <TextField name="engine" label={t('fields.engine')} placeholder={t('fields.engine')} />
        <SelectField
          name="fuelType"
          label={t('fields.fuelType')}
          options={fuelTypeOptions}
          placeholder={t('fields.fuelType')}
        />
        <TextField name="vin" label={t('fields.vin')} placeholder={t('fields.vin')} />
        <TextField
          name="registrationNumber"
          label={t('fields.registrationNumber')}
          placeholder={t('fields.registrationNumber')}
        />
        <SelectField
          name="currencyCode"
          label={t('fields.currencyCode')}
          options={CURRENCY_OPTIONS}
          placeholder={t('fields.currencyCode')}
        />
        <FormSubmit>{submitLabel}</FormSubmit>
      </AppForm>
    </div>
  );
}
