import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/use-session';
import { authClient } from '@/lib/auth-client';

export function UserMenu() {
  const { t } = useTranslation('nav');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: session } = useSession();

  async function handleSignOut() {
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: ['session'] });
    await navigate({ to: '/login' });
  }

  return (
    <div className="flex items-center gap-3">
      {session?.user && (
        <span className="hidden text-sm text-muted-foreground sm:inline-block">
          {session.user.name || session.user.email}
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void handleSignOut()}
        aria-label={t('user.signOut')}
      >
        <LogOut className="mr-1 h-4 w-4" aria-hidden="true" />
        {t('user.signOut')}
      </Button>
    </div>
  );
}
