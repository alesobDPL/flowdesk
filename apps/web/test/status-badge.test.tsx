import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { REQUEST_STATUSES } from '@flowdesk/shared';
import { afterEach, expect, it } from 'vitest';
import en from '../messages/en.json';
import es from '../messages/es.json';
import { StatusBadge } from '../src/components/status-badge';

afterEach(cleanup);

it.each([
  { locale: 'es', messages: es },
  { locale: 'en', messages: en },
])(
  'labels every status in $locale without relying on color',
  ({ locale, messages }) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        {REQUEST_STATUSES.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </NextIntlClientProvider>,
    );
    for (const status of REQUEST_STATUSES)
      expect(screen.getByText(messages.statuses[status])).toBeDefined();
  },
);
