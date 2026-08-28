import { Link } from '@tanstack/react-router';
import {
  BatteryCharging,
  CarFront,
  ChartNoAxesCombined,
  ClipboardCheck,
  Fuel,
  Moon,
  ShieldCheck,
  Sun,
  Wrench,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppLogo } from '@/components/AppLogo';
import { ImageLightbox } from '@/components/ImageLightbox';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTheme } from '@/components/ThemeProvider';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const featureIcons = [CarFront, Fuel, BatteryCharging, Wrench, ChartNoAxesCombined, ClipboardCheck];

export function LandingPage() {
  const { t } = useTranslation(['landing', 'common']);
  const { theme, toggleTheme } = useTheme();
  const features = t('features.items', { returnObjects: true }) as Array<{
    title: string;
    description: string;
  }>;

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur">
        <nav
          className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8"
          aria-label={t('nav.label')}
        >
          <Link to="/" className="flex items-center gap-2.5" aria-label={t('common:appName')}>
            <AppLogo />
            <span className="hidden font-display text-lg font-bold tracking-tight sm:inline">
              {t('common:appName')}
            </span>
          </Link>
          <div className="ml-auto hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              {t('nav.features')}
            </a>
            <a href="#preview" className="transition-colors hover:text-foreground">
              {t('nav.preview')}
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              {t('nav.howItWorks')}
            </a>
          </div>
          <div className="ml-auto flex items-center gap-1.5 lg:ml-6">
            <LanguageSwitcher />
            <button
              type="button"
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('common:theme.toLight') : t('common:theme.toDark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <Link
              to="/login"
              search={{ mode: 'signIn' }}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'hidden sm:inline-flex',
              )}
            >
              {t('actions.signIn')}
            </Link>
            <Link
              to="/login"
              search={{ mode: 'signUp' }}
              className={buttonVariants({ size: 'sm' })}
            >
              {t('actions.signUp')}
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate border-b">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_15%,hsl(var(--primary)/0.18),transparent_30%),radial-gradient(circle_at_25%_85%,hsl(var(--accent)/0.8),transparent_35%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="label-micro mb-5 text-primary">{t('eyebrow')}</p>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              {t('hero.description')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                search={{ mode: 'signUp' }}
                className={buttonVariants({ size: 'lg' })}
              >
                {t('actions.signUp')}
              </Link>
              <a href="#preview" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                {t('actions.preview')}
              </a>
            </div>
            <ul className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              {(['private', 'pwa', 'bilingual'] as const).map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t(`proof.${item}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-3xl">
            <div className="hidden overflow-hidden rounded-2xl border bg-card p-2 shadow-2xl shadow-primary/10 sm:block">
              <ImageLightbox
                src="/showcase/dashboard-ev-desktop.png"
                alt={t('screens.dashboardAlt')}
                openLabel={t('screens.openPreview')}
                closeLabel={t('screens.closePreview')}
                imageClassName="rounded-xl"
              />
            </div>
            <div className="mx-auto w-full max-w-64 rounded-[2rem] border bg-card p-2 shadow-2xl shadow-primary/10 sm:hidden">
              <ImageLightbox
                src="/showcase/dashboard-ev-mobile.png"
                alt={t('screens.evAlt')}
                openLabel={t('screens.openPreview')}
                closeLabel={t('screens.closePreview')}
                imageClassName="rounded-[1.5rem]"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="label-micro text-primary">{t('features.eyebrow')}</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-muted-foreground">{t('features.description')}</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = featureIcons[index] ?? CarFront;
            return (
              <article key={feature.title} className="rounded-2xl border bg-card p-6">
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <h3 className="mt-5 font-display text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="preview" className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-8">
          <div className="order-2 lg:order-1">
            <div className="mx-auto w-full max-w-[22rem] rounded-[2rem] border bg-card p-2 shadow-xl">
              <ImageLightbox
                src="/showcase/activity-mobile.png"
                alt={t('screens.activityAlt')}
                openLabel={t('screens.openPreview')}
                closeLabel={t('screens.closePreview')}
                imageClassName="rounded-[1.5rem]"
              />
            </div>
          </div>
          <div className="order-1 flex flex-col justify-center lg:order-2">
            <p className="label-micro text-primary">{t('tour.eyebrow')}</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">
              {t('tour.title')}
            </h2>
            <p className="mt-4 max-w-lg text-muted-foreground">{t('tour.description')}</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {t('tour.points', { returnObjects: true }).map((point) => (
                <li key={point} className="flex gap-3">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="label-micro text-primary">{t('how.eyebrow')}</p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">{t('how.title')}</h2>
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {(
            t('how.steps', { returnObjects: true }) as Array<{ title: string; description: string }>
          ).map((step, index) => (
            <li key={step.title} className="rounded-2xl border p-6">
              <span className="font-display text-3xl font-bold text-primary">
                {'0'}
                {index + 1}
              </span>
              <h3 className="mt-6 font-display text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">{t('closing.title')}</h2>
            <p className="mt-2 text-primary-foreground/80">{t('closing.description')}</p>
          </div>
          <Link
            to="/login"
            search={{ mode: 'signUp' }}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-background px-8 text-sm font-medium text-foreground transition-colors hover:bg-background/90"
          >
            {t('actions.signUp')}
          </Link>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>
          {'© '}
          {new Date().getFullYear()} {t('common:appName')}
        </span>
        <a href="https://github.com/sergiusz-x/carnotea" className="hover:text-foreground">
          {t('footer.github')}
        </a>
      </footer>
    </main>
  );
}
