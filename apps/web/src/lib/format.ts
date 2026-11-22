import { APP_TIME_ZONE, type Locale } from '@flowdesk/shared';
import { createTranslator } from 'next-intl';
import en from '../../messages/en.json';
import es from '../../messages/es.json';

export function formatRemaining(ms: number, locale: Locale): string {
  const t = createTranslator({
    locale,
    messages: locale === 'es' ? es : en,
    namespace: 'countdown',
  });
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
  if (totalMinutes < 1) return t('lessThanMinute');
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? t('hoursMinutes', { hours, minutes })
    : t('minutes', { minutes });
}

export function formatDate(value: string | Date, locale: Locale): string {
  // Date-only values represent a calendar date, without a time-zone conversion.
  const dateOnly =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: dateOnly ? 'UTC' : APP_TIME_ZONE,
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: APP_TIME_ZONE,
  }).format(new Date(value));
}
