import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStepForm(form: UseFormReturn<any>, stepFields: string[][]) {
  const [currentStep, setCurrentStep] = useState(0);

  const goNext = async () => {
    const fields = stepFields[currentStep] ?? [];
    const valid = await form.trigger(fields);
    if (valid) setCurrentStep((s) => s + 1);
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  return { currentStep, goNext, goBack };
}
