import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, expect, it, vi } from 'vitest';
import es from '../messages/es.json';
import ApprovalsPage from '../src/app/[locale]/app/approvals/page';
import QueuePage from '../src/app/[locale]/app/queue/page';
import { request, technician } from './helpers/request';
import type { ReactNode } from 'react';

vi.mock('../src/i18n/navigation', () => ({
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([
  {
    component: ApprovalsPage,
    title: es.app.nav.approvals,
    subtitle: 'Revisa las solicitudes y registra tus decisiones.',
  },
  {
    component: QueuePage,
    title: es.app.nav.queue,
    subtitle: 'Gestiona los accesos aprobados y registra tu trabajo.',
  },
])(
  'each list page has one h1 and its subtitle: $title',
  async ({ component: Component, title, subtitle }) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((path: string) =>
        Promise.resolve(
          Response.json(
            path === '/api/v1/session'
              ? {
                  activeIdentity: 'it_agent',
                  user: technician,
                  roles: ['it_agent'],
                  identities: [{ identity: 'it_agent', user: technician }],
                  expiresAt: '2099-11-22T20:00:00Z',
                }
              : { items: [request], nextCursor: null },
          ),
        ),
      ),
    );
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <QueryClientProvider client={new QueryClient()}>
          <Component />
        </QueryClientProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
    expect(screen.getByText(subtitle)).toBeDefined();
    const table = await screen.findByRole('table');
    expect(table.classList.contains('table-fixed')).toBe(true);
    const status = within(table).getByText(es.statuses.approved);
    expect(status.classList.contains('whitespace-nowrap')).toBe(true);
    expect(status.closest('td')?.classList.contains('whitespace-nowrap')).toBe(
      true,
    );
    expect(
      status.parentElement?.querySelector('[aria-hidden="true"]'),
    ).not.toBeNull();
    expect(status.parentElement?.className).not.toMatch(/bg-blue/);
  },
);

it.each([
  {
    component: ApprovalsPage,
    tabs: ['Pendientes', 'Decididas'],
    views: ['approvals_pending', 'approvals_decided'],
  },
  {
    component: QueuePage,
    tabs: ['Disponibles', 'Asignadas a mí', 'Completadas'],
    views: ['queue', 'assigned', 'completed'],
  },
])(
  'loads the correct API view for each $tabs tab',
  async ({ component: Component, tabs, views }) => {
    const fetch = vi.fn().mockImplementation((path: string) =>
      Promise.resolve(
        Response.json(
          path === '/api/v1/session'
            ? {
                activeIdentity: 'it_agent',
                user: technician,
                roles: ['it_agent'],
                identities: [{ identity: 'it_agent', user: technician }],
                expiresAt: '2099-11-22T20:00:00Z',
              }
            : { items: [], nextCursor: null },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetch);
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <QueryClientProvider client={new QueryClient()}>
          <Component />
        </QueryClientProvider>
      </NextIntlClientProvider>,
    );
    for (const [index, tab] of tabs.entries()) {
      await userEvent.click(screen.getByRole('tab', { name: tab }));
      await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
          `/api/v1/requests?view=${views[index]}`,
          expect.anything(),
        ),
      );
    }
  },
);
