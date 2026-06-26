import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface FormContainerProps {
  children: ReactNode;
  className?: string;
}

export function FormContainer({ children, className }: FormContainerProps) {
  return (
    <div className={cn('container mx-auto max-w-screen-md px-4 py-8', className)}>{children}</div>
  );
}
