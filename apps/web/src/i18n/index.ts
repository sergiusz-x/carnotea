import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { configureZodErrorMap } from '../lib/forms/zod-i18n';
import enAuth from '../locales/en/auth.json';
import enCommon from '../locales/en/common.json';
import enForms from '../locales/en/forms.json';
import enHealth from '../locales/en/health.json';
import enLanding from '../locales/en/landing.json';
import enNav from '../locales/en/nav.json';
import enVehicles from '../locales/en/vehicles.json';
import plAuth from '../locales/pl/auth.json';
import plCommon from '../locales/pl/common.json';
import plForms from '../locales/pl/forms.json';
import plHealth from '../locales/pl/health.json';
import plLanding from '../locales/pl/landing.json';
import plNav from '../locales/pl/nav.json';
import plVehicles from '../locales/pl/vehicles.json';

export const SUPPORTED_LANGUAGES = ['pl', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_NS = 'common';

export const resources = {
  en: {
    common: enCommon,
    forms: enForms,
    health: enHealth,
    landing: enLanding,
    auth: enAuth,
    nav: enNav,
    vehicles: enVehicles,
  },
  pl: {
    common: plCommon,
    forms: plForms,
    health: plHealth,
    landing: plLanding,
    auth: plAuth,
    nav: plNav,
    vehicles: plVehicles,
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
    ns: ['common', 'forms', 'health', 'landing', 'auth', 'nav', 'vehicles'],
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
