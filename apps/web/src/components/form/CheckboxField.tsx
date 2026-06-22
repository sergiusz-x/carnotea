import { useFormContext } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface CheckboxFieldProps {
  name: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function CheckboxField({ name, label, description, disabled }: CheckboxFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-2">
            <FormControl>
              <input
                type="checkbox"
                name={field.name}
                ref={field.ref}
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- react-hook-form ControllerRenderProps.value is typed as `any`
                checked={field.value ?? false}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={disabled}
                className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </FormControl>
            <FormLabel className="!mt-0 cursor-pointer">{label}</FormLabel>
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
