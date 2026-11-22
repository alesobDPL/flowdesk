import { APP_TIME_ZONE, type Locale } from '@flowdesk/shared';

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
