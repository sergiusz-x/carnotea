import {
  ExpenseCreateSchema,
  ExpenseUpdateSchema,
  EXPENSE_CATEGORY_CODES,
  type ExpenseCategoryCode,
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
  setServerErrors,
  useZodForm,
  type SelectOption,
} from '@/components/form';
import { expenseQueryOptions, useCreateExpense, useUpdateExpense } from '@/features/expenses/queries';
import type { ApiError } from '@/lib/api/client';

// ─── Category options ─────────────────────────────────────────────────────────

function useCategoryOptions(): SelectOption[] {
  const { t } = useTranslation('expenses');

  return EXPENSE_CATEGORY_CODES.map((code) => ({
    value: code,
    label: t(`categories.${code}` as const),
  }));
}

// ─── Create page ───────────────────────────────────────────────────────────────

export function ExpenseCreatePage() {
  const { vehicleId }: { vehicleId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/expenses/new',
  });
  const { t } = useTranslation('expenses');

  const createMutation = useCreateExpense(vehicleId);
  const categoryOptions = useCategoryOptions();

  const form = useZodForm(ExpenseCreateSchema, {
    defaultValues: {
      expenseDate: new Date().toISOString().slice(0, 10),
      category: 'other',
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
      categoryOptions={categoryOptions}
    />
  );
}

// ─── Edit page ─────────────────────────────────────────────────────────────────

export function ExpenseEditPage() {
  const { vehicleId, expenseId }: { vehicleId: string; expenseId: string } = useParams({
    from: '/_authenticated/vehicles/$vehicleId/expenses/$expenseId/edit',
  });
  const { t } = useTranslation('expenses');

  const { data: existingExpense } = useSuspenseQuery(
    expenseQueryOptions(vehicleId, expenseId),
  );

  const updateMutation = useUpdateExpense(vehicleId, expenseId);
  const categoryOptions = useCategoryOptions();

  const form = useZodForm(ExpenseUpdateSchema, {
    defaultValues: {
      expenseDate: existingExpense.expenseDate,
      category: existingExpense.category as ExpenseCategoryCode,
      amount: existingExpense.amount,
      description: existingExpense.description ?? undefined,
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
      categoryOptions={categoryOptions}
    />
  );
}

// ─── Shared form shell ─────────────────────────────────────────────────────────

function FormShell({
  title,
  submitLabel,
  form,
  onSubmit,
  categoryOptions,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  categoryOptions: SelectOption[];
}) {
  const { t } = useTranslation('expenses');

  return (
    <div className="container mx-auto max-w-screen-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{title}</h1>

      <AppForm form={form} onSubmit={onSubmit}>
        <DateField
          name="expenseDate"
          label={t('fields.expenseDate')}
        />
        <SelectField
          name="category"
          label={t('fields.category')}
          options={categoryOptions}
          placeholder={t('fields.category')}
        />
        <NumberField
          name="amount"
          label={t('fields.amount')}
          placeholder={t('fields.amount')}
          min={0}
          step={0.01}
        />
        <TextField
          name="description"
          label={t('fields.description')}
          placeholder={t('fields.description')}
        />
        <FormSubmit>{submitLabel}</FormSubmit>
      </AppForm>
    </div>
  );
}