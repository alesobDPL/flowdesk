import { useMutation, useQuery } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { afterEach, expect, it, vi } from 'vitest';
import en from '../messages/en.json';
import { Providers } from '../src/components/providers';
import { ApiClientError } from '../src/lib/api-client';

const route = vi.hoisted(() => ({
  pathname: '/app/requests',
  replace: vi.fn(),
}));
vi.mock('../src/i18n/navigation', () => ({
  useRouter: () => ({ replace: route.replace }),
  usePathname: () => route.pathname,
}));

function Failure({
  status,
  mutation = false,
}: {
  status: number;
  mutation?: boolean;
}) {
  const query = useQuery({
    queryKey: ['failure'],
    queryFn: () => Promise.reject(new ApiClientError(status, 'FORBIDDEN')),
    retry: false,
    enabled: !mutation,
  });
  const action = useMutation({
    mutationFn: () =>
      Promise.reject(new ApiClientError(status, 'SESSION_EXPIRED')),
  });
  return (
    <>
      <button onClick={() => action.mutate()}>Run</button>
      <p role="status">{query.isError ? 'failed' : 'waiting'}</p>
    </>
  );
}

function show(status: number, mutation = false) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Providers>
        <Failure status={status} mutation={mutation} />
      </Providers>
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  route.replace.mockClear();
  route.pathname = '/app/requests';
});

it('redirects a 401 query in the application to the expired page', async () => {
  show(401);
  await waitFor(() =>
    expect(route.replace).toHaveBeenCalledWith('/demo-expired'),
  );
});

it('redirects a 401 mutation in the application to the expired page', async () => {
  show(401, true);
  await userEvent.click(screen.getByRole('button', { name: 'Run' }));
  await waitFor(() =>
    expect(route.replace).toHaveBeenCalledWith('/demo-expired'),
  );
});

it('keeps a welcome session 401 on the welcome page', async () => {
  route.pathname = '/';
  show(401);
  await screen.findByText('failed');
  expect(route.replace).not.toHaveBeenCalled();
});

it.each([403, 404])(
  'refreshes identity on detail %s and redirects with a notice',
  async (status) => {
    route.pathname = '/app/requests/[id]';
    const user = {
      id: 'it',
      displayName: 'Ana Torres',
      jobTitle: 'IT Support',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          activeIdentity: 'it_agent',
          user,
          roles: ['it_agent'],
          identities: [{ identity: 'it_agent', user }],
          expiresAt: '2026-11-22T20:00:00Z',
        }),
      ),
    );
    const notice = vi.spyOn(toast, 'info').mockReturnValue('notice');
    show(status);
    await waitFor(() =>
      expect(route.replace).toHaveBeenCalledWith('/app/queue'),
    );
    expect(notice).toHaveBeenCalledWith(
      en.app.requestUnavailable,
      expect.anything(),
    );
  },
);

it('does not redirect a 403 from a list', async () => {
  show(403);
  await screen.findByText('failed');
  expect(route.replace).not.toHaveBeenCalled();
});
