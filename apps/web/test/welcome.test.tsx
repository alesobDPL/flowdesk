import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import type { SessionInfo } from '@flowdesk/shared';
import { afterEach, expect, it, vi } from 'vitest';
import en from '../messages/en.json';
import es from '../messages/es.json';
import WelcomePage from '../src/app/[locale]/page';
import ExpiredPage from '../src/app/[locale]/demo-expired/page';

const { push, replace } = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('../src/i18n/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

const user = { id: 'user', displayName: 'Laura', jobTitle: 'Employee' };
const session: SessionInfo = {
  activeIdentity: 'employee',
  user,
  roles: ['requester'],
  identities: [{ identity: 'employee', user }],
  expiresAt: '2026-11-22T20:00:00Z',
};

function show(page = <WelcomePage />, locale: 'en' | 'es' = 'en') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'es' ? es : en}
    >
      <QueryClientProvider client={client}>{page}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it('try demo button keeps its exact accessible name', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { code: 'SESSION_REQUIRED', details: {} } },
          { status: 401 },
        ),
      ),
  );
  show(<WelcomePage />, 'es');
  expect(
    await screen.findByRole('button', { name: 'Probar demo' }),
  ).toBeDefined();
});

it.each([
  {
    locale: 'es' as const,
    source: 'Código en GitHub',
    newTab: 'Se abre en otra pestaña',
  },
  {
    locale: 'en' as const,
    source: 'Source on GitHub',
    newTab: 'Opens in a new tab',
  },
])('GitHub link opens safely in $locale', ({ locale, source, newTab }) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(session)));
  show(<WelcomePage />, locale);
  const link = screen.getByRole('link', {
    name: `${source} ${newTab}`,
  });
  expect(link.getAttribute('href')).toBe(
    'https://github.com/alesobDPL/flowdesk',
  );
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')?.split(' ')).toEqual(
    expect.arrayContaining(['noopener', 'noreferrer']),
  );
});

it.each([
  {
    locale: 'es' as const,
    title: 'Tres perspectivas',
    roles: ['Empleada', 'Aprobador', 'TI'],
  },
  {
    locale: 'en' as const,
    title: 'Three perspectives',
    roles: ['Employee', 'Approver', 'IT'],
  },
])('renders the three perspectives in $locale', ({ locale, title, roles }) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(session)));
  show(<WelcomePage />, locale);
  expect(screen.getByRole('heading', { name: title })).toBeDefined();
  for (const role of roles)
    expect(screen.getByText(role, { exact: true })).toBeDefined();
});

it('continues an existing session without creating a space', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json(session));
  vi.stubGlobal('fetch', fetch);
  show();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Continue demo' }),
  );
  expect(push).toHaveBeenCalledWith('/app');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('creates a space in the current locale and disables duplicate submission', async () => {
  let finish: ((response: Response) => void) | undefined;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        { error: { code: 'SESSION_REQUIRED', details: {} } },
        { status: 401 },
      ),
    )
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
  vi.stubGlobal('fetch', fetch);
  show();
  const button = await screen.findByRole('button', { name: 'Try the demo' });
  await userEvent.dblClick(button);
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenLastCalledWith(
    '/api/v1/demo/spaces',
    expect.objectContaining({ method: 'POST', body: '{"locale":"en"}' }),
  );
  finish?.(Response.json(session, { status: 201 }));
  await waitFor(() => expect(push).toHaveBeenCalledWith('/app'));
});

it.each([
  { status: 503, code: 'DEMO_AT_CAPACITY' as const },
  { status: 429, code: 'RATE_LIMITED' as const },
])('shows a friendly message on $status', async ({ status, code }) => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: 'SESSION_REQUIRED', details: {} } },
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ error: { code, details: {} } }, { status }),
      ),
  );
  show();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Try the demo' }),
  );
  expect((await screen.findByRole('alert')).textContent).toBe(en.errors[code]);
  expect(push).not.toHaveBeenCalled();
});

it('starts another demo from the expired page', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json(session, { status: 201 })),
  );
  show(<ExpiredPage />);
  await userEvent.click(
    screen.getByRole('button', { name: 'Start a new demo' }),
  );
  await waitFor(() => expect(push).toHaveBeenCalledWith('/app'));
});
