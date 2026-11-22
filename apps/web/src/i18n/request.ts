import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { APP_TIME_ZONE } from '@flowdesk/shared';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  return {
    locale,
    timeZone: APP_TIME_ZONE,
    messages: (
      await (locale === 'es'
        ? import('../../messages/es.json')
        : import('../../messages/en.json'))
    ).default,
  };
});
