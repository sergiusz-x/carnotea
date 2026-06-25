import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { AppForm, FormSubmit, TextField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

import { sessionQueryOptions } from './use-session';

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

type SignInValues = z.infer<typeof signInSchema>;

interface SignInFormProps {
  redirectTo?: string;
  onSwitchToSignUp: () => void;
}

export function SignInForm({ redirectTo, onSwitchToSignUp }: SignInFormProps) {
  const { t } = useTranslation('auth');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const form = useZodForm(signInSchema);

  async function onSubmit(values: SignInValues) {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      form.setError('root', { message: t('errors.invalidCredentials') });
      return;
    }

    queryClient.removeQueries({ queryKey: ['session'] });
    await queryClient.ensureQueryData(sessionQueryOptions);
    await navigate({ to: redirectTo ?? '/', replace: true });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('signIn.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('signIn.subtitle')}</p>
      </div>

      <AppForm form={form} onSubmit={onSubmit}>
        <TextField
          name="email"
          type="email"
          label={t('signIn.emailLabel')}
          placeholder={t('signIn.emailPlaceholder')}
        />
        <TextField
          name="password"
          type="password"
          label={t('signIn.passwordLabel')}
          placeholder={t('signIn.passwordPlaceholder')}
        />
        <FormSubmit>{t('signIn.submit')}</FormSubmit>
      </AppForm>

      <Button
        type="button"
        variant="ghost"
        className="w-full text-sm text-muted-foreground hover:text-foreground"
        onClick={onSwitchToSignUp}
      >
        {t('signIn.switchToSignUp')}
      </Button>
    </div>
  );
}
