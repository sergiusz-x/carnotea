import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enCommon from '../locales/en/common.json';
import enHealth from '../locales/en/health.json';
import enLanding from '../locales/en/landing.json';
import plCommon from '../locales/pl/common.json';
import plHealth from '../locales/pl/health.json';
import plLanding from '../locales/pl/landing.json';

export const SUPPORTED_LANGUAGES = ['pl', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_NS = 'common';

export const resources = {
  en: { common: enCommon, health: enHealth, landing: enLanding },
  pl: { common: plCommon, health: plHealth, landing: plLanding },
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
    ns: ['common', 'health', 'landing'],
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

export default i18n;
