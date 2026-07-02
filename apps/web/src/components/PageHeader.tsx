import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  action?: ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      {action}
    </div>
  );
}
