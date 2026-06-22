import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { configureZodErrorMap } from '../lib/forms/zod-i18n';
import enAuth from '../locales/en/auth.json';
import enCharging from '../locales/en/charging.json';
import enCommon from '../locales/en/common.json';
import enDashboard from '../locales/en/dashboard.json';
import enExpenses from '../locales/en/expenses.json';
import enForms from '../locales/en/forms.json';
import enFuelLogs from '../locales/en/fuel-logs.json';
import enHealth from '../locales/en/health.json';
import enIssues from '../locales/en/issues.json';
import enLanding from '../locales/en/landing.json';
import enNav from '../locales/en/nav.json';
import enProfile from '../locales/en/profile.json';
import enReminders from '../locales/en/reminders.json';
import enService from '../locales/en/service.json';
import enVehicles from '../locales/en/vehicles.json';
import plAuth from '../locales/pl/auth.json';
import plCharging from '../locales/pl/charging.json';
import plCommon from '../locales/pl/common.json';
import plDashboard from '../locales/pl/dashboard.json';
import plExpenses from '../locales/pl/expenses.json';
import plForms from '../locales/pl/forms.json';
import plFuelLogs from '../locales/pl/fuel-logs.json';
import plHealth from '../locales/pl/health.json';
import plIssues from '../locales/pl/issues.json';
import plLanding from '../locales/pl/landing.json';
import plNav from '../locales/pl/nav.json';
import plProfile from '../locales/pl/profile.json';
import plReminders from '../locales/pl/reminders.json';
import plService from '../locales/pl/service.json';
import plVehicles from '../locales/pl/vehicles.json';

export const SUPPORTED_LANGUAGES = ['pl', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_NS = 'common';

export const resources = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    forms: enForms,
    health: enHealth,
    issues: enIssues,
    landing: enLanding,
    auth: enAuth,
    nav: enNav,
    profile: enProfile,
    reminders: enReminders,
    vehicles: enVehicles,
    'fuel-logs': enFuelLogs,
    charging: enCharging,
    service: enService,
    expenses: enExpenses,
  },
  pl: {
    common: plCommon,
    dashboard: plDashboard,
    forms: plForms,
    health: plHealth,
    issues: plIssues,
    landing: plLanding,
    auth: plAuth,
    nav: plNav,
    profile: plProfile,
    reminders: plReminders,
    vehicles: plVehicles,
    'fuel-logs': plFuelLogs,
    charging: plCharging,
    service: plService,
    expenses: plExpenses,
  },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    // Map regional browser tags (e.g. 'en-US', 'pl-PL') to our base languages.
    load: 'languageOnly',
    defaultNS: DEFAULT_NS,
    ns: [
      'common',
      'dashboard',
      'forms',
      'health',
      'issues',
      'landing',
      'auth',
      'nav',
      'profile',
      'reminders',
      'vehicles',
      'fuel-logs',
      'charging',
      'service',
      'expenses',
    ],
    interpolation: { escapeValue: false },
    // Resources are bundled, so init resolves synchronously; no Suspense
    // boundary is needed and tests render translated text immediately.
    react: { useSuspense: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'carnotea.lang',
    },
  });

// Wire the Zod error map after i18next is ready so validation errors render
// in the active language rather than Zod's built-in English messages.
configureZodErrorMap();

export default i18n;
