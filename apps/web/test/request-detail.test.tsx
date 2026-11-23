import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
        <main>
          <DetailPage />
        </main>
      </Providers>
    </NextIntlClientProvider>,
  );
}

it('hides the actions card when no action is available', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(Response.json({ ...request, allowedActions: [] })),
  );
  show();
  const heading = await screen.findByRole('heading', { level: 1 });
  expect(heading.getAttribute('tabindex')).toBe('-1');
  expect(heading.id).not.toBe('');
  expect(
    screen.queryByRole('heading', { name: es.requestDetail.actions }),
  ).toBeNull();
  expect(
    screen.queryByRole('region', { name: es.requestDetail.actions }),
  ).toBeNull();
  expect(document.activeElement).not.toBe(heading);
});

it('renders the status badge exactly once inside main', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(request)));
  show();
  await screen.findByRole('heading', { level: 1 });
  const main = within(screen.getByRole('main'));
  const status = main.getAllByText(es.statuses.approved, { exact: true });
  expect(status).toHaveLength(1);
  expect(status[0]!.parentElement?.classList.contains('bg-blue-50')).toBe(true);
  const header = status[0]!.closest('header')!;
  const created = header.querySelector('time');
  expect(created?.dateTime).toBe(request.createdAt);
  expect(
    status[0]!.compareDocumentPosition(created!) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it.each([
  { action: 'complete', label: es.actions.complete, status: 'completed' },
  { action: 'reject', label: es.actions.reject, status: 'rejected' },
])(
  'moves focus to the heading after the last $action empties the actions',
  async ({ action, label, status }) => {
    let completed = false;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_path: string, init: RequestInit) => {
        if (init.method === 'POST') completed = true;
        return Promise.resolve(
          Response.json({
            ...request,
            status: completed
              ? status
              : action === 'complete'
                ? 'in_progress'
                : 'pending_approval',
            allowedActions: completed ? [] : [action],
          }),
        );
      }),
    );
    show();
    await userEvent.click(await screen.findByRole('button', { name: label }));
    const dialog = within(screen.getByRole('dialog'));
    if (action === 'reject')
      await userEvent.type(
        dialog.getByRole('textbox'),
        'No se necesita este acceso.',
      );
    await userEvent.click(dialog.getByRole('button', { name: label }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('heading', { level: 1 }),
      ),
    );
    expect(
      screen.queryByRole('heading', { name: es.requestDetail.actions }),
    ).toBeNull();
  },
);

it('keeps the dialog locked until the last action and its refetch finish', async () => {
  let completed = false;
  let finishRefetch: ((value: Response) => void) | undefined;
  const result = { ...request, status: 'completed', allowedActions: [] };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((_path: string, init: RequestInit) => {
      if (init.method === 'POST') {
        completed = true;
        return Promise.resolve(Response.json(result));
      }
      if (completed)
        return new Promise<Response>((resolve) => {
          finishRefetch = resolve;
        });
      return Promise.resolve(
        Response.json({
          ...request,
          status: 'in_progress',
          allowedActions: ['complete'],
        }),
      );
    }),
  );
  show();
  await userEvent.click(
    await screen.findByRole('button', { name: es.actions.complete }),
  );
  const dialog = screen.getByRole('dialog');
  await userEvent.click(
    within(dialog).getByRole('button', { name: es.actions.complete }),
  );
  await waitFor(() => expect(finishRefetch).toBeDefined());
  expect(screen.getByRole('dialog')).toBe(dialog);
  expect(
    within(dialog).getByRole<HTMLButtonElement>('button', {
      name: es.app.cancel,
    }).disabled,
  ).toBe(true);
  expect(document.activeElement).not.toBe(
    document.getElementById('request-title'),
  );
  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('dialog')).toBe(dialog);
  finishRefetch?.(Response.json(result));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { level: 1 }),
    ),
  );
});

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
