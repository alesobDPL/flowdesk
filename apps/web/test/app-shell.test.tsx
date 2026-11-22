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
import type { ReactNode } from 'react';
import type { SessionInfo } from '@flowdesk/shared';
import { afterEach, expect, it, vi } from 'vitest';
import es from '../messages/es.json';
import { AppShell } from '../src/components/app-shell';
import AppPage from '../src/app/[locale]/app/page';

const route = vi.hoisted(() => ({
  pathname: '/app/approvals',
  replace: vi.fn(),
}));
vi.mock('../src/i18n/navigation', () => ({
  useRouter: () => ({ replace: route.replace }),
  usePathname: () => route.pathname,
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({ useParams: () => ({}) }));

const employee = {
  id: 'employee',
  displayName: 'Laura Méndez',
  jobTitle: 'Marketing',
};
const approver = {
  id: 'approver',
  displayName: 'Diego Rojas',
  jobTitle: 'Jefe de TI',
};
const session: SessionInfo = {
  activeIdentity: 'approver',
  user: approver,
  roles: ['approver'],
  identities: [
    { identity: 'employee', user: employee },
    { identity: 'approver', user: approver },
  ],
  expiresAt: '2099-11-22T20:00:00Z',
};

function show(children: ReactNode = <h1>{es.app.nav.approvals}</h1>) {
  const client = new QueryClient();
  const fetch = vi.fn().mockImplementation((path: string) =>
    Promise.resolve(
      Response.json(
        path === '/api/v1/demo/tour'
          ? {
              created: false,
              decided: false,
              assigned: false,
              completed: false,
            }
          : path === '/api/v1/demo/spaces/reset'
            ? {
                ...session,
                activeIdentity: 'employee',
                user: employee,
                roles: ['requester'],
              }
            : session,
      ),
    ),
  );
  vi.stubGlobal('fetch', fetch);
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <QueryClientProvider client={client}>
        <AppShell>{children}</AppShell>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return { fetch };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  route.replace.mockClear();
  route.pathname = '/app/approvals';
});

it('shows the active fictional name, role, and role navigation', async () => {
  show();
  expect(
    await screen.findByRole('heading', { name: es.app.nav.approvals }),
  ).toBeDefined();
  expect(
    screen.getByRole('combobox', { name: es.app.viewingAs }).textContent,
  ).toContain('Diego Rojas');
  expect(
    screen.getByRole('combobox', { name: es.app.viewingAs }).textContent,
  ).toContain('Aprobador');
  expect(
    screen
      .getByRole('link', { name: es.app.nav.approvals })
      .getAttribute('aria-current'),
  ).toBe('page');
  expect(screen.queryByRole('link', { name: es.app.nav.requests })).toBeNull();
});

it('requires confirmation, focuses cancel, then resets with the current locale', async () => {
  const { fetch } = show();
  await userEvent.click(
    await screen.findByRole('button', { name: es.app.reset }),
  );
  const dialog = screen.getByRole('dialog');
  expect(
    fetch.mock.calls.some(([path]) => path === '/api/v1/demo/spaces/reset'),
  ).toBe(false);
  expect(document.activeElement).toBe(
    within(dialog).getByRole('button', { name: es.app.cancel }),
  );
  await userEvent.click(
    within(dialog).getByRole('button', { name: es.app.confirmReset }),
  );
  await waitFor(() =>
    expect(route.replace).toHaveBeenCalledWith('/app/requests'),
  );
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/demo/spaces/reset',
    expect.objectContaining({ method: 'POST', body: '{"locale":"es"}' }),
  );
});

it('/app redirects to the active identity’s list', async () => {
  route.pathname = '/app';
  show(<AppPage />);
  await waitFor(() =>
    expect(route.replace).toHaveBeenCalledWith('/app/approvals'),
  );
});
