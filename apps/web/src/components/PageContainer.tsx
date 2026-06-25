import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('container mx-auto max-w-screen-xl px-4 py-8', className)}>
      {children}
    </div>
  );
}
