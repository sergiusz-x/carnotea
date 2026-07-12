import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { AppForm, FormSubmit, TextField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

import { sessionQueryOptions } from './use-session';

const signUpSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});

type SignUpValues = z.infer<typeof signUpSchema>;

interface SignUpFormProps {
  redirectTo?: string;
  onSwitchToSignIn: () => void;
}

export function SignUpForm({ redirectTo, onSwitchToSignIn }: SignUpFormProps) {
  const { t } = useTranslation('auth');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const form = useZodForm(signUpSchema);

  async function onSubmit(values: SignUpValues) {
    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });

    if (error) {
      const message = error.status === 422 ? t('errors.emailTaken') : t('errors.generic');
      form.setError('root', { message });
      return;
    }

    queryClient.removeQueries({ queryKey: ['session'] });

    try {
      const session = await queryClient.ensureQueryData(sessionQueryOptions);
      if (!session?.user) {
        form.setError('root', { message: t('errors.sessionSync') });
        return;
      }
    } catch {
      form.setError('root', { message: t('errors.sessionSync') });
      return;
    }

    await navigate({ to: redirectTo ?? '/', replace: true });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('signUp.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('signUp.subtitle')}</p>
      </div>

      <AppForm form={form} onSubmit={onSubmit}>
        <TextField
          name="name"
          label={t('signUp.nameLabel')}
          placeholder={t('signUp.namePlaceholder')}
        />
        <TextField
          name="email"
          type="email"
          label={t('signUp.emailLabel')}
          placeholder={t('signUp.emailPlaceholder')}
        />
        <TextField
          name="password"
          type="password"
          label={t('signUp.passwordLabel')}
          placeholder={t('signUp.passwordPlaceholder')}
        />
        <FormSubmit>{t('signUp.submit')}</FormSubmit>
      </AppForm>

      <Button
        type="button"
        variant="ghost"
        className="w-full text-sm text-muted-foreground hover:text-foreground"
        onClick={onSwitchToSignIn}
      >
        {t('signUp.switchToSignIn')}
      </Button>
    </div>
  );
}
