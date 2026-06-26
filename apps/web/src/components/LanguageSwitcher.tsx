import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';

const LANGUAGE_LABEL_KEYS: Record<SupportedLanguage, 'language.english' | 'language.polish'> = {
  en: 'language.english',
  pl: 'language.polish',
};

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;
  const current = SUPPORTED_LANGUAGES.find((lng) => currentLanguage.startsWith(lng)) ?? 'en';

  return (
    <Select value={current} onValueChange={(val) => void i18n.changeLanguage(val)}>
      <SelectTrigger className="h-9 w-[110px]" aria-label={t('language.label')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((lng) => (
          <SelectItem key={lng} value={lng}>
            {t(LANGUAGE_LABEL_KEYS[lng])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
