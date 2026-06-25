import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/use-session';
import { authClient } from '@/lib/auth-client';

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase();
  }
  return (email?.[0] ?? '?').toUpperCase();
}

export function UserMenu() {
  const { t } = useTranslation('nav');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user;

  async function handleSignOut() {
    await authClient.signOut();
    queryClient.setQueryData(['session'], null);
    await navigate({ to: '/login' });
  }

  const initials = user ? getInitials(user.name, user.email) : null;
  const displayName = user ? user.name || user.email : null;

  return (
    <div className="flex items-center gap-2">
      {user && (
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {initials}
          </div>
          <span className="hidden max-w-[140px] truncate text-sm font-medium lg:inline-block">
            {displayName}
          </span>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void handleSignOut()}
        aria-label={t('user.signOut')}
        className="gap-1.5"
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">{t('user.signOut')}</span>
      </Button>
    </div>
  );
}
