import { type UserProfileUpdate } from '@carnotea/shared';
import { UserProfileUpdateSchema } from '@carnotea/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { AppForm, FormSubmit, SelectField, TextField, useZodForm, setServerErrors } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { profileQueryOptions, useUpdateProfile } from '../queries';

/** ISO-4217 currency codes relevant for the app context. */
const CURRENCY_OPTIONS = [
  { value: 'PLN', label: 'PLN (zł)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CHF', label: 'CHF (Fr)' },
];

export function ProfileScreen() {
  const { t, i18n } = useTranslation('profile');

  const { data: profile, isLoading, isError, error, refetch } = useQuery(profileQueryOptions);
  const updateProfile = useUpdateProfile();

  const form = useZodForm(UserProfileUpdateSchema, {
    defaultValues: {
      firstName: '',
      lastName: '',
      localePref: 'en',
      unitsPref: 'metric',
      currencyPref: 'PLN',
    },
  });

  // Sync form values when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        localePref: profile.localePref,
        unitsPref: profile.unitsPref,
        currencyPref: profile.currencyPref,
      });
    }
  }, [profile, form]);

  // Watch locale changes and switch i18next language live
  const watchedLocale = form.watch('localePref');
  useEffect(() => {
    if (watchedLocale && watchedLocale !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(watchedLocale);
    }
  }, [watchedLocale, i18n]);

  async function handleSubmit(values: UserProfileUpdate) {
    try {
      await updateProfile.mutateAsync(values);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
        setServerErrors(
          form.setError,
          err as { code: string; message: string; issues?: Array<{ code: string; path: (string | number)[]; message: string }> },
        );
      } else {
        form.setError('root', { message: t('error.saveFailed') });
      }
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
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
    <div className="container mx-auto max-w-2xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('description')}</p>
      </div>

      {/* ── Account section ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('account.title')}</CardTitle>
          <CardDescription>{t('account.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AppForm form={form} onSubmit={handleSubmit}>
            <TextField name="firstName" label={t('account.firstName')} />
            <TextField name="lastName" label={t('account.lastName')} />

            {/* Email — read-only display */}
            <div className="space-y-1">
              <label className="text-sm font-medium leading-none">{t('account.email')}</label>
              <p className="text-sm text-muted-foreground border rounded-md px-3 py-2 bg-muted/50">
                {profile?.email ?? ''}
              </p>
            </div>

            {profile?.createdAt && (
              <p className="text-sm text-muted-foreground pt-2">
                {t('account.memberSince')}{':'}{' '}
                {new Date(profile.createdAt).toLocaleDateString(i18n.resolvedLanguage ?? 'en', {
                  year: 'numeric',
                  month: 'long',
                })}
              </p>
            )}

            <FormSubmit>{t('preferences.saving')}</FormSubmit>
          </AppForm>
        </CardContent>
      </Card>

      {/* ── Preferences section ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('preferences.title')}</CardTitle>
          <CardDescription>{t('preferences.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AppForm form={form} onSubmit={handleSubmit}>
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
            <FormSubmit>{t('preferences.saving')}</FormSubmit>
          </AppForm>
        </CardContent>
      </Card>

      {/* ── Data section — GDPR links (placeholders for T-052) ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t('data.title')}</CardTitle>
          <CardDescription>{t('data.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{t('data.export')}</p>
              <p className="text-sm text-muted-foreground">{t('data.exportDescription')}</p>
            </div>
            <span className="text-xs text-muted-foreground">{t('data.comingSoon')}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">{t('data.delete')}</p>
              <p className="text-sm text-muted-foreground">{t('data.deleteDescription')}</p>
            </div>
            <span className="text-xs text-muted-foreground">{t('data.comingSoon')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}