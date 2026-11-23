import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import type { RequestSummary, SessionInfo } from '@flowdesk/shared';
import { afterEach, expect, it, vi } from 'vitest';
import es from '../messages/es.json';
import { RequestTable } from '../src/components/request-table';
import RequestsPage from '../src/app/[locale]/app/requests/page';

vi.mock('../src/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname: string; params: { id: string } };
    children: ReactNode;
  }) => (
    <a
      href={
        typeof href === 'string'
          ? href
          : href.pathname.replace('[id]', href.params.id)
      }
      {...props}
    >
      {children}
    </a>
  ),
}));

const user = {
  id: 'employee',
  displayName: 'Laura Méndez',
  jobTitle: 'Marketing',
};
const session: SessionInfo = {
  activeIdentity: 'employee',
  user,
  roles: ['requester'],
  identities: [{ identity: 'employee', user }],
  expiresAt: '2099-11-22T20:00:00Z',
};
const first: RequestSummary = {
  id: 'first',
  code: 'FD-0001',
  softwareName: 'Figma',
  accessLevel: 'read',
  status: 'approved',
  requester: user,
  createdAt: '2026-11-22T15:00:00Z',
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function show(children: ReactNode, current = session) {
  const client = new QueryClient();
  client.setQueryData(['session'], current);
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

it('each list page has one h1 and its subtitle', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((path: string) =>
        Promise.resolve(
          Response.json(
            path === '/api/v1/session'
              ? session
              : { items: [], nextCursor: null },
          ),
        ),
      ),
  );
  show(<RequestsPage />);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    es.app.nav.requests,
  );
  expect(
    screen.getByText('Consulta tus solicitudes y sigue su progreso.'),
  ).toBeDefined();
  await screen.findByText(es.requests.emptyMine);
});

it('table uses fixed layout and the status cell does not wrap', async () => {
  const longName = 'S'.repeat(100);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((path: string) =>
      Promise.resolve(
        Response.json(
          path === '/api/v1/session'
            ? session
            : {
                items: [{ ...first, softwareName: longName }],
                nextCursor: null,
              },
        ),
      ),
    ),
  );
  show(
    <RequestTable
      query={{ view: 'mine' }}
      emptyMessageKey="requests.emptyMine"
    />,
  );
  const table = await screen.findByRole('table');
  expect(table.classList.contains('table-fixed')).toBe(true);
  const columns = table.querySelectorAll('colgroup col');
  expect(columns).toHaveLength(5);
  for (const column of columns) expect(column.className).toMatch(/w-/);
  const status = within(table).getByText(es.statuses.approved);
  expect(status.classList.contains('whitespace-nowrap')).toBe(true);
  expect(status.closest('td')?.classList.contains('whitespace-nowrap')).toBe(
    true,
  );
  expect(
    status.parentElement?.querySelector('[aria-hidden="true"]'),
  ).not.toBeNull();
  expect(status.parentElement?.className).not.toMatch(/bg-blue/);
  expect(within(table).getByText(longName).getAttribute('title')).toBe(
    longName,
  );
});

it('accumulates cursor pages and preserves filters and detail links', async () => {
  const fetch = vi.fn().mockImplementation((path: string) =>
    Promise.resolve(
      Response.json(
        path === '/api/v1/session'
          ? session
          : path.includes('cursor=')
            ? {
                items: [{ ...first, id: 'second', code: 'FD-0002' }],
                nextCursor: null,
              }
            : { items: [first], nextCursor: 'next-cursor' },
      ),
    ),
  );
  vi.stubGlobal('fetch', fetch);
  show(
    <RequestTable
      query={{ view: 'mine', status: 'approved', q: '%_' }}
      emptyMessageKey="requests.emptyMine"
    />,
  );
  expect(
    (
      await screen.findByRole('link', { name: 'Abrir solicitud FD-0001' })
    ).getAttribute('href'),
  ).toBe('/app/requests/first');
  await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
  expect(
    await screen.findByRole('link', { name: 'Abrir solicitud FD-0002' }),
  ).toBeDefined();
  expect(
    screen.getByRole('link', { name: 'Abrir solicitud FD-0001' }),
  ).toBeDefined();
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/requests?view=mine&status=approved&q=%25_&cursor=next-cursor',
    expect.anything(),
  );
  expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
});

it('offers a creation link in the employee empty state', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((path: string) =>
        Promise.resolve(
          Response.json(
            path === '/api/v1/session'
              ? session
              : { items: [], nextCursor: null },
          ),
        ),
      ),
  );
  show(
    <RequestTable
      query={{ view: 'mine' }}
      emptyMessageKey="requests.emptyMine"
    />,
  );
  expect(await screen.findByText(es.requests.emptyMine)).toBeDefined();
  expect(
    screen
      .getByRole('link', { name: 'Crear una solicitud' })
      .getAttribute('href'),
  ).toBe('/app/requests/new');
});

it('debounces search by 300 ms', async () => {
  vi.useFakeTimers();
  const fetch = vi
    .fn()
    .mockImplementation((path: string) =>
      Promise.resolve(
        Response.json(
          path === '/api/v1/session'
            ? session
            : { items: [], nextCursor: null },
        ),
      ),
    );
  vi.stubGlobal('fetch', fetch);
  show(<RequestsPage />);
  fireEvent.change(
    screen.getByRole('textbox', { name: 'Buscar solicitudes' }),
    { target: { value: 'Figma' } },
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(299);
  });
  expect(
    fetch.mock.calls.filter(([path]) => String(path).includes('/requests?')),
  ).toHaveLength(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/requests?view=mine&q=Figma',
    expect.anything(),
  );
});

it('shows no creation links for another identity', async () => {
  const approver: SessionInfo = {
    ...session,
    activeIdentity: 'approver',
    roles: ['approver'],
  };
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation((path: string) =>
        Promise.resolve(
          Response.json(
            path === '/api/v1/session'
              ? approver
              : { items: [], nextCursor: null },
          ),
        ),
      ),
  );
  show(<RequestsPage />, approver);
  await screen.findByText(es.requests.emptyMine);
  expect(screen.queryByRole('link', { name: 'Nueva solicitud' })).toBeNull();
  expect(
    screen.queryByRole('link', { name: 'Crear una solicitud' }),
  ).toBeNull();
});
