import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { useFormState } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StepWizardProps {
  steps: string[];
  currentStep: number;
  onBack: () => void;
  onNext: () => Promise<void>;
  isEditing?: boolean;
  submitLabel: string;
  children: React.ReactNode;
}

export function StepWizard({
  steps,
  currentStep,
  onBack,
  onNext,
  isEditing,
  submitLabel,
  children,
}: StepWizardProps) {
  const { t } = useTranslation('forms');
  const { isSubmitting, errors } = useFormState();
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const rootError = (errors as Record<string, { message?: string } | undefined>)['root']?.message;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{steps[currentStep]}</span>
          <span>{t('wizard.stepOf', { current: currentStep + 1, total: steps.length })}</span>
        </div>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                i < currentStep && 'bg-primary',
                i === currentStep && 'bg-primary',
                i > currentStep && 'bg-muted',
              )}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="space-y-4">{children}</div>

      {/* Root-level server error */}
      {rootError && (
        <p role="alert" className="text-sm text-destructive">
          {rootError}
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-2 pt-2">
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="gap-1.5"
            disabled={isSubmitting}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('wizard.back')}
          </Button>
        )}
        <div className="flex-1" />
        {isEditing && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('submit.loading') : submitLabel}
          </Button>
        )}
        {!isLastStep && (
          <Button
            type="button"
            onClick={() => void onNext()}
            disabled={isSubmitting}
            className="gap-1.5"
          >
            {t('wizard.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {!isEditing && isLastStep && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('submit.loading') : submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
