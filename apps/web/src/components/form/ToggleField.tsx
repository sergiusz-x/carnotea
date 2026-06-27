import { useFormContext } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

interface ToggleFieldProps {
  name: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function ToggleField({ name, label, description, disabled }: ToggleFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const checked: boolean = field.value ?? false;
        return (
          <FormItem>
            <div className="flex items-center justify-between gap-4 py-1">
              <FormLabel className="!mt-0 cursor-pointer text-base">{label}</FormLabel>
              <FormControl>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  disabled={disabled}
                  onClick={() => {
                    field.onChange(!checked);
                  }}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
                    'transition-colors duration-200 ease-in-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    checked ? 'bg-primary' : 'bg-input',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0',
                      'transition-transform duration-200 ease-in-out',
                      checked ? 'translate-x-5' : 'translate-x-1',
                    )}
                  />
                </button>
              </FormControl>
            </div>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
