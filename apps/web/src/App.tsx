import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatDistanceKm } from '@/lib/format';

export function App() {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation(['landing', 'common']);

  const locale = i18n.resolvedLanguage ?? i18n.language;
  const today = formatDate(new Date(), locale);
  const sampleDistance = formatDistanceKm(12345.6, locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? t('common:theme.toLight') : t('common:theme.toDark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('common:appName')}</CardTitle>
          <CardDescription>{t('landing:tagline')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button className="w-full">{t('landing:getStarted')}</Button>
          <dl className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <dt>{t('landing:preview.today')}</dt>
              <dd>{today}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('landing:preview.sampleDistance')}</dt>
              <dd>{sampleDistance}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </main>
  );
}
