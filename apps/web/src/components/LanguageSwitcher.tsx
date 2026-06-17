import { type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';

const LANGUAGE_LABEL_KEYS: Record<SupportedLanguage, 'language.english' | 'language.polish'> = {
  en: 'language.english',
  pl: 'language.polish',
};

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const current = i18n.resolvedLanguage ?? i18n.language;

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    void i18n.changeLanguage(event.target.value);
  }

  return (
    <select
      aria-label={t('language.label')}
      value={current}
      onChange={handleChange}
      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <option key={lng} value={lng}>
          {t(LANGUAGE_LABEL_KEYS[lng])}
        </option>
      ))}
    </select>
  );
}
