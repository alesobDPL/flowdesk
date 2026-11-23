import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it } from 'vitest';
import es from '../messages/es.json';
import en from '../messages/en.json';
import { RequestTimeline } from '../src/components/request-timeline';
import { request } from './helpers/request';

afterEach(cleanup);

it('keeps a list named by timeline.title with one heading per event and decorative rail', () => {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <RequestTimeline events={request.events} />
    </NextIntlClientProvider>,
  );
  const list = screen.getByRole('list', { name: es.timeline.title });
  const items = within(list).getAllByRole('listitem');
  expect(items).toHaveLength(request.events.length);
  expect(
    items.map((item) => {
      const headings = within(item).getAllByRole('heading');
      expect(headings).toHaveLength(1);
      expect(headings[0]!.tagName).toBe('H3');
      expect(item.querySelector('[aria-hidden="true"]')).not.toBeNull();
      return headings[0]!.textContent;
    }),
  ).toEqual([es.events.created, es.events.approved]);
  expect(
    list.parentElement?.querySelector(':scope > [aria-hidden="true"]'),
  ).not.toBeNull();
});

it.each([
  {
    locale: 'es',
    messages: es,
    created: 'Solicitud creada',
    approved: 'Solicitud aprobada',
  },
  {
    locale: 'en',
    messages: en,
    created: 'Request created',
    approved: 'Request approved',
  },
])(
  'renders chronological events, actors, notes and localized dates in $locale',
  ({ locale, messages, created, approved }) => {
    const { container } = render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RequestTimeline events={request.events} />
      </NextIntlClientProvider>,
    );
    const events = screen.getAllByRole('listitem');
    expect(within(events[0]!).getByText(created)).toBeDefined();
    expect(within(events[0]!).getByText('Laura Méndez')).toBeDefined();
    expect(within(events[1]!).getByText(approved)).toBeDefined();
    expect(within(events[1]!).getByText('Diego Rojas')).toBeDefined();
    expect(within(events[1]!).getByText('Acceso revisado.')).toBeDefined();
    const times = [...container.querySelectorAll('time')];
    expect(times.map((time) => time.dateTime)).toEqual([
      '2026-11-22T15:00:00Z',
      '2026-11-22T15:10:00Z',
    ]);
    expect(times[0]?.textContent).toContain(locale === 'es' ? 'nov' : 'Nov');
  },
);
