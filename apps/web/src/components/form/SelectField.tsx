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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
            <Select
              value={(field.value as string) || undefined}
              onValueChange={(val) => {
                field.onChange(val);
              }}
              disabled={disabled}
            >
              <SelectTrigger ref={field.ref} onBlur={field.onBlur}>
                <SelectValue placeholder={placeholder ?? t('select.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
