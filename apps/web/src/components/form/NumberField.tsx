import { useFormContext } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface NumberFieldProps {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField({
  name,
  label,
  description,
  placeholder,
  disabled,
  min,
  max,
  step,
}: NumberFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={placeholder}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              name={field.name}
              ref={field.ref}
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              value={field.value ?? ''}
              onChange={(e) => {
                field.onChange(e.target.value === '' ? undefined : Number(e.target.value));
              }}
              onBlur={field.onBlur}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
