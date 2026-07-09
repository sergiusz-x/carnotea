import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { configureZodErrorMap } from '../lib/forms/zod-i18n';
import enActivity from '../locales/en/activity.json';
import enAuth from '../locales/en/auth.json';
import enCharging from '../locales/en/charging.json';
import enCommon from '../locales/en/common.json';
import enDashboard from '../locales/en/dashboard.json';
import enExpenses from '../locales/en/expenses.json';
import enFluidLogs from '../locales/en/fluid-logs.json';
import enForms from '../locales/en/forms.json';
import enFuelLogs from '../locales/en/fuel-logs.json';
import enGdpr from '../locales/en/gdpr.json';
import enHealth from '../locales/en/health.json';
import enIssues from '../locales/en/issues.json';
import enLanding from '../locales/en/landing.json';
import enNav from '../locales/en/nav.json';
import enProfile from '../locales/en/profile.json';
import enReminders from '../locales/en/reminders.json';
import enService from '../locales/en/service.json';
import enVehicles from '../locales/en/vehicles.json';
import plActivity from '../locales/pl/activity.json';
import plAuth from '../locales/pl/auth.json';
import plCharging from '../locales/pl/charging.json';
import plCommon from '../locales/pl/common.json';
import plDashboard from '../locales/pl/dashboard.json';
import plExpenses from '../locales/pl/expenses.json';
import plFluidLogs from '../locales/pl/fluid-logs.json';
import plForms from '../locales/pl/forms.json';
import plFuelLogs from '../locales/pl/fuel-logs.json';
import plGdpr from '../locales/pl/gdpr.json';
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
    activity: enActivity,
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
    'fluid-logs': enFluidLogs,
    service: enService,
    expenses: enExpenses,
    gdpr: enGdpr,
  },
  pl: {
    common: plCommon,
    activity: plActivity,
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
    'fluid-logs': plFluidLogs,
    service: plService,
    expenses: plExpenses,
    gdpr: plGdpr,
  },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    load: 'languageOnly',
    defaultNS: DEFAULT_NS,
    ns: [
      'common',
      'activity',
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
      'fluid-logs',
      'service',
      'expenses',
      'gdpr',
    ],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'carnotea.lang',
    },
  });

configureZodErrorMap();

export default i18n;
