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

it('inline variant shows a decorative dot and the status text', () => {
  const { container } = render(
    <NextIntlClientProvider locale="es" messages={es}>
      <StatusBadge status="approved" />
    </NextIntlClientProvider>,
  );

  expect(screen.getByText('Aprobada · en cola de TI')).toBeDefined();
  const dot = container.querySelector('[aria-hidden="true"]');
  expect(dot).not.toBeNull();
  expect(dot?.classList.contains('bg-blue-500')).toBe(true);
  expect(container.firstElementChild?.className).not.toMatch(/\bbg-blue-50\b/);
});

it.each(['inline', 'badge'] as const)(
  'status text never wraps in the %s variant',
  (variant) => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        {REQUEST_STATUSES.map((status) => (
          <StatusBadge key={status} status={status} variant={variant} />
        ))}
      </NextIntlClientProvider>,
    );

    for (const status of REQUEST_STATUSES)
      expect(
        screen
          .getByText(es.statuses[status])
          .classList.contains('whitespace-nowrap'),
      ).toBe(true);
  },
);

it.each([
  { status: 'pending_approval', family: 'amber' },
  { status: 'approved', family: 'blue' },
  { status: 'in_progress', family: 'violet' },
  { status: 'completed', family: 'emerald' },
  { status: 'rejected', family: 'rose' },
] as const)(
  'badge variant uses a tinted background for $status',
  ({ status, family }) => {
    const { container } = render(
      <NextIntlClientProvider locale="es" messages={es}>
        <StatusBadge status={status} variant="badge" />
      </NextIntlClientProvider>,
    );

    expect(
      container.firstElementChild?.classList.contains(`bg-${family}-50`),
    ).toBe(true);
    expect(
      screen
        .getByText(es.statuses[status])
        .classList.contains(`text-${family}-800`),
    ).toBe(true);
    expect(
      container
        .querySelector('[aria-hidden="true"]')
        ?.classList.contains(`bg-${family}-500`),
    ).toBe(true);
  },
);
