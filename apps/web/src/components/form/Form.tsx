import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import {
  type DefaultValues,
  type FieldValues,
  useForm,
  useFormState,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form as FormProvider } from '@/components/ui/form';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useZodForm<TSchema extends z.ZodType<any>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, 'resolver'> & {
    defaultValues?: DefaultValues<z.infer<TSchema>>;
  },
): UseFormReturn<z.infer<TSchema>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
  return useForm<z.infer<TSchema>>({ ...options, resolver: zodResolver(schema as any) }) as any;
}

interface AppFormProps<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  onSubmit: (values: TValues) => void | Promise<void>;
  className?: string;
  children: React.ReactNode;
}

export function AppForm<TValues extends FieldValues>({
  form,
  onSubmit,
  className,
  children,
}: AppFormProps<TValues>) {
  return (
    <FormProvider {...form}>
      <form
        // handleSubmit wraps onSubmit; we intentionally discard the returned Promise
        // because React's onSubmit attribute expects void.
        onSubmit={(e) => {
          void form.handleSubmit(onSubmit)(e);
        }}
        className={cn('space-y-4', className)}
      >
        {children}
      </form>
    </FormProvider>
  );
}

interface FormSubmitProps {
  children?: React.ReactNode;
  className?: string;
}

export function FormSubmit({ children, className }: FormSubmitProps) {
  const { t } = useTranslation('forms');
  const { isSubmitting, errors } = useFormState();
  const rootError = (errors as Record<string, { message?: string } | undefined>)['root']?.message;

  return (
    <div className={cn('space-y-2', className)}>
      {rootError && (
        <p role="alert" className="text-sm text-destructive">
          {rootError}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('submit.loading') : children}
      </Button>
    </div>
  );
}
