import { Minus, Plus } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

interface BigNumberFieldProps {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

function precisionOf(n: number): number {
  const s = n.toString();
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

function round(value: number, step: number): number {
  const p = precisionOf(step);
  return Math.round(value * 10 ** p) / 10 ** p;
}

export function BigNumberField({
  name,
  label,
  description,
  placeholder,
  disabled,
  min,
  max,
  step = 1,
  suffix,
}: BigNumberFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const current: number | undefined = field.value;

        const decrement = () => {
          const base = current ?? 0;
          const next = round(base - step, step);
          field.onChange(min !== undefined ? Math.max(min, next) : next);
        };

        const increment = () => {
          const base = current ?? 0;
          const next = round(base + step, step);
          field.onChange(max !== undefined ? Math.min(max, next) : next);
        };

        const atMin = min !== undefined && (current ?? 0) <= min;
        const atMax = max !== undefined && (current ?? 0) >= max;

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-xl"
                  onClick={decrement}
                  disabled={disabled ?? atMin}
                  aria-label={`Decrease ${label}`}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <div className="relative flex-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={placeholder}
                    disabled={disabled}
                    min={min}
                    max={max}
                    step={step}
                    name={field.name}
                    ref={field.ref}
                    value={current ?? ''}
                    onChange={(e) => {
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value));
                    }}
                    onBlur={field.onBlur}
                    className={cn(
                      'flex h-12 w-full rounded-xl border border-input bg-background px-3 text-center text-xl font-semibold ring-offset-background',
                      'placeholder:text-muted-foreground/50 placeholder:text-base placeholder:font-normal',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                      suffix && 'pr-14',
                    )}
                  />
                  {suffix && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      {suffix}
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-xl"
                  onClick={increment}
                  disabled={disabled ?? atMax}
                  aria-label={`Increase ${label}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
