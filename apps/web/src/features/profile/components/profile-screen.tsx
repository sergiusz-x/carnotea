import { UserProfileUpdateSchema } from '@carnotea/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { type z } from 'zod';

import {
  AppForm,
  FormSubmit,
  SelectField,
  TextField,
  useZodForm,
  setServerErrors,
} from '@/components/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { GdprSection } from '@/features/gdpr/components/gdpr-section';

import { profileQueryOptions, useUpdateProfile } from '../queries';

const accountSchema = UserProfileUpdateSchema.pick({
  firstName: true,
  lastName: true,
});

const preferencesSchema = UserProfileUpdateSchema.pick({
  localePref: true,
  unitsPref: true,
  currencyPref: true,
});

type AccountValues = z.infer<typeof accountSchema>;
type PreferencesValues = z.infer<typeof preferencesSchema>;

/** ISO-4217 currency codes relevant for the app context. */
const CURRENCY_OPTIONS = [
  { value: 'PLN', label: 'PLN (zl)' },
  { value: 'EUR', label: 'EUR (EUR)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (GBP)' },
  { value: 'CHF', label: 'CHF (CHF)' },
];

function isApiError(err: unknown): err is {
  code: string;
  message: string;
  issues?: Array<{ code: string; path: (string | number)[]; message: string }>;
} {
  return Boolean(err && typeof err === 'object' && 'code' in err && 'message' in err);
}

export function ProfileScreen() {
  const { t, i18n } = useTranslation('profile');

  const { data: profile, isLoading, isError, error, refetch } = useQuery(profileQueryOptions);
  const updateAccount = useUpdateProfile();
  const updatePreferences = useUpdateProfile();

  const accountForm = useZodForm(accountSchema, {
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  const preferencesForm = useZodForm(preferencesSchema, {
    defaultValues: {
      localePref: 'en',
      unitsPref: 'metric',
      currencyPref: 'PLN',
    },
  });

  // Sync form values when profile data loads.
  useEffect(() => {
    if (profile) {
      accountForm.reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
      preferencesForm.reset({
        localePref: profile.localePref,
        unitsPref: profile.unitsPref,
        currencyPref: profile.currencyPref,
      });
    }
  }, [profile, accountForm, preferencesForm]);

  // Watch locale changes and switch i18next language live.
  const watchedLocale = preferencesForm.watch('localePref');
  useEffect(() => {
    if (watchedLocale && watchedLocale !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(watchedLocale);
    }
  }, [watchedLocale, i18n]);

  async function handleAccountSubmit(values: AccountValues) {
    try {
      await updateAccount.mutateAsync(values);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setServerErrors(accountForm.setError, err);
      } else {
        accountForm.setError('root', { message: t('error.saveFailed') });
      }
    }
  }

  async function handlePreferencesSubmit(values: PreferencesValues) {
    try {
      await updatePreferences.mutateAsync(values);
    } catch (err: unknown) {
      if (isApiError(err)) {
        setServerErrors(preferencesForm.setError, err);
      } else {
        preferencesForm.setError('root', { message: t('error.saveFailed') });
      }
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">
              {error instanceof Error ? error.message : t('error.loadFailed')}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
              {t('error.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('account.title')}</CardTitle>
          <CardDescription>{t('account.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AppForm form={accountForm} onSubmit={handleAccountSubmit}>
            <TextField name="firstName" label={t('account.firstName')} />
            <TextField name="lastName" label={t('account.lastName')} />

            <div className="space-y-1">
              <Label>{t('account.email')}</Label>
              <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {profile?.email ?? ''}
              </p>
            </div>

            {profile?.createdAt && (
              <p className="pt-2 text-sm text-muted-foreground">
                {t('account.memberSince')}
                {':'}{' '}
                {new Date(profile.createdAt).toLocaleDateString(i18n.resolvedLanguage ?? 'en', {
                  year: 'numeric',
                  month: 'long',
                })}
              </p>
            )}

            <FormSubmit>{t('account.save')}</FormSubmit>
          </AppForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.title')}</CardTitle>
          <CardDescription>{t('preferences.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AppForm form={preferencesForm} onSubmit={handlePreferencesSubmit}>
            <SelectField
              name="localePref"
              label={t('preferences.locale')}
              options={[
                { value: 'en', label: t('preferences.localeEnglish') },
                { value: 'pl', label: t('preferences.localePolish') },
              ]}
            />
            <SelectField
              name="unitsPref"
              label={t('preferences.units')}
              options={[
                { value: 'metric', label: t('preferences.unitsMetric') },
                { value: 'imperial', label: t('preferences.unitsImperial') },
              ]}
            />
            <SelectField
              name="currencyPref"
              label={t('preferences.currency')}
              options={CURRENCY_OPTIONS}
            />
            <FormSubmit>{t('preferences.save')}</FormSubmit>
          </AppForm>
        </CardContent>
      </Card>

      <GdprSection userEmail={profile?.email ?? ''} />
    </div>
  );
}
