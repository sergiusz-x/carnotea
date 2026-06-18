import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: string;
  label: string;
  options: SelectOption[];
  description?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function SelectField({
  name,
  label,
  options,
  description,
  placeholder,
  disabled,
}: SelectFieldProps) {
  const { control } = useFormContext();
  const { t } = useTranslation('forms');

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <select
              name={field.name}
              ref={field.ref}
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm ring-offset-background',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              <option value="">{placeholder ?? t('select.placeholder')}</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
