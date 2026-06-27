/**
 * Locale-aware presentation helpers. The active locale comes from i18next
 * (`i18n.resolvedLanguage`) so dates and numbers render in the language the
 * user picked — see ADR-0007.
 */

export function formatDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(value);
}

export function formatDistanceKm(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
