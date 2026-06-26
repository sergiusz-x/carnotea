import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className }: AppLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn('h-7 w-7 shrink-0 text-foreground', className)}
    >
      <path
        d="M20.8 11.4C19.6 10.2 18 9.5 16.1 9.5C12.8 9.5 10.1 12.2 10.1 15.5C10.1 18.8 12.8 21.5 16.1 21.5C18 21.5 19.6 20.8 20.8 19.6"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22.6 13.2L25 13.2" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="22.6" cy="18.8" r="1.1" fill="currentColor" />
    </svg>
  );
}
