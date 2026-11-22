import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { afterEach, expect, it, vi } from 'vitest';
import es from '../messages/es.json';
import { Providers } from '../src/components/providers';
import DetailPage from '../src/app/[locale]/app/requests/[id]/page';
import { request, approver, technician } from './helpers/request';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('../src/i18n/navigation', () => ({
  usePathname: () => '/app/requests/[id]',
  useRouter: () => ({ replace }),
}));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'request-id' }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  replace.mockClear();
});
function show() {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <Providers>
        <DetailPage />
      </Providers>
    </NextIntlClientProvider>,
  );
}

it('renders the actual detail, people and history', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json({
        ...request,
        assignee: technician,
        completedBy: technician,
        status: 'completed',
        allowedActions: [],
      }),
    ),
  );
  show();
  expect(
    await screen.findByRole('heading', { name: 'FD-0006 · Figma' }),
  ).toBeDefined();
  expect(screen.getByText(request.justification)).toBeDefined();
  expect(screen.getByText('Completada')).toBeDefined();
  expect(screen.getAllByText('Ana Torres')).toHaveLength(2);
  expect(screen.getByRole('heading', { name: 'Historial' })).toBeDefined();
});

it.each([403, 404])(
  'a real detail %s refreshes the identity and returns to its list',
  async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((path: string) =>
        Promise.resolve(
          path === '/api/v1/session'
            ? Response.json({
                activeIdentity: 'it_agent',
                user: technician,
                roles: ['it_agent'],
                identities: [{ identity: 'it_agent', user: technician }],
                expiresAt: '2099-11-22T20:00:00Z',
              })
            : Response.json(
                {
                  error: {
                    code: status === 403 ? 'FORBIDDEN' : 'NOT_FOUND',
                    message: 'Unavailable.',
                    details: {},
                  },
                },
                { status },
              ),
        ),
      ),
    );
    const notice = vi.spyOn(toast, 'info').mockReturnValue('notice');
    show();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/app/queue'));
    expect(notice).toHaveBeenCalledWith(
      es.app.requestUnavailable,
      expect.anything(),
    );
  },
);

it('a stale-tab action 403 uses the current server identity for navigation', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((path: string, init: RequestInit) =>
      Promise.resolve(
        path === '/api/v1/session'
          ? Response.json({
              activeIdentity: 'approver',
              user: approver,
              roles: ['approver'],
              identities: [{ identity: 'approver', user: approver }],
              expiresAt: '2099-11-22T20:00:00Z',
            })
          : init.method === 'POST'
            ? Response.json(
                {
                  error: {
                    code: 'FORBIDDEN',
                    message: 'Role changed.',
                    details: {},
                  },
                },
                { status: 403 },
              )
            : Response.json(request),
      ),
    ),
  );
  show();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Asignarme' }),
  );
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/app/approvals'));
});
