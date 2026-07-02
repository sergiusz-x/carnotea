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
  BigNumberField,
  DateField,
  SelectField,
  StepWizard,
  TextareaField,
  handleApiError,
  useStepForm,
  useZodForm,
  type SelectOption,
} from '@/components/form';
import { FormContainer } from '@/components/FormContainer';
import { PageHeader } from '@/components/PageHeader';
import {
  expenseQueryOptions,
  useCreateExpense,
  useUpdateExpense,
} from '@/features/expenses/queries';
import { formatMoney } from '@/lib/format';
import { useCurrencyPref } from '@/lib/useCurrencyPref';

// ─── Step field groups ────────────────────────────────────────────────────────

const STEP_FIELDS = [['expenseDate', 'category', 'description'], ['amount'], []];

// ─── Category options ─────────────────────────────────────────────────────────

function useCategoryOptions(): SelectOption[] {
  const { t } = useTranslation('expenses');

  return EXPENSE_CATEGORY_CODES.map((code) => ({
    value: code,
    label: t(`categories.${code}` as const),
  }));
}

// ─── Summary (step 3) ─────────────────────────────────────────────────────────

function ExpenseSummary({ form }: { form: ReturnType<typeof useZodForm> }) {
  const { t, i18n } = useTranslation('expenses');
  const currency = useCurrencyPref();
  const values = form.getValues() as {
    expenseDate?: string;
    category?: ExpenseCategoryCode;
    description?: string;
    amount?: number;
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t('wizard.step3')}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {values.expenseDate && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryDate')}</dt>
            <dd className="font-medium">{values.expenseDate}</dd>
          </>
        )}
        {values.category && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryCategory')}</dt>
            <dd className="font-medium">{t(`categories.${values.category}`)}</dd>
          </>
        )}
        {values.description && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryDescription')}</dt>
            <dd className="font-medium">{values.description}</dd>
          </>
        )}
        {values.amount != null && (
          <>
            <dt className="text-muted-foreground">{t('wizard.summaryAmount')}</dt>
            <dd className="text-base font-bold text-primary">
              {formatMoney(values.amount, currency, i18n.resolvedLanguage ?? 'en')}
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
  categoryOptions,
}: {
  title: string;
  submitLabel: string;
  form: ReturnType<typeof useZodForm>;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  categoryOptions: SelectOption[];
}) {
  const { t } = useTranslation('expenses');
  const currency = useCurrencyPref();
  const { currentStep, goNext, goBack } = useStepForm(form, STEP_FIELDS);

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
          submitLabel={submitLabel}
        >
          {currentStep === 0 && (
            <>
              <DateField name="expenseDate" label={t('fields.expenseDate')} />
              <SelectField
                name="category"
                label={t('fields.category')}
                options={categoryOptions}
                placeholder={t('fields.category')}
              />
              <TextareaField
                name="description"
                label={t('fields.description')}
                placeholder={t('fields.description')}
                rows={3}
              />
            </>
          )}

          {currentStep === 1 && (
            <BigNumberField
              name="amount"
              label={t('fields.amount')}
              placeholder="0.00"
              min={0}
              step={1}
              suffix={currency}
            />
          )}

          {currentStep === 2 && <ExpenseSummary form={form} />}
        </StepWizard>
      </AppForm>
    </FormContainer>
  );
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
      handleApiError(error, form.setError);
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

  const { data: existingExpense } = useSuspenseQuery(expenseQueryOptions(vehicleId, expenseId));

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
      handleApiError(error, form.setError);
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
