import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { SessionInfo } from '@flowdesk/shared';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useResetDemo, useSwitchIdentity, useTour } from '../src/lib/queries';

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
  expiresAt: '2026-11-22T20:00:00Z',
};

function setup() {
  const client = new QueryClient();
  client.setQueryData(['session'], session);
  client.setQueryData(['requests', 'mine'], { items: [] });
  client.setQueryData(['tour'], {
    created: true,
    decided: false,
    assigned: false,
    completed: false,
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('switches identity and invalidates all cached queries', async () => {
  const approver: SessionInfo = {
    ...session,
    activeIdentity: 'approver',
    roles: ['approver'],
    user: {
      id: 'approver',
      displayName: 'Diego Rojas',
      jobTitle: 'Head of IT',
    },
  };
  const fetch = vi.fn().mockResolvedValue(Response.json(approver));
  vi.stubGlobal('fetch', fetch);
  const { client, wrapper } = setup();
  const { result } = renderHook(() => useSwitchIdentity(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync('approver');
  });
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/session/identity',
    expect.objectContaining({ method: 'PUT', body: '{"identity":"approver"}' }),
  );
  expect(client.getQueryData(['session'])).toEqual(approver);
  for (const key of [['session'], ['requests', 'mine'], ['tour']]) {
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  }
});

it('resets in the current locale and refreshes active tour progress', async () => {
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
          : session,
      ),
    ),
  );
  vi.stubGlobal('fetch', fetch);
  const { client, wrapper } = setup();
  const { result } = renderHook(
    () => ({ reset: useResetDemo(), tour: useTour() }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.tour.isFetching).toBe(false));
  fetch.mockClear();
  await act(async () => {
    await result.current.reset.mutateAsync('es');
  });
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/demo/spaces/reset',
    expect.objectContaining({ method: 'POST', body: '{"locale":"es"}' }),
  );
  expect(fetch).toHaveBeenCalledWith('/api/v1/demo/tour', expect.anything());
  expect(client.getQueryState(['requests', 'mine'])?.isInvalidated).toBe(true);
  expect(result.current.tour.data?.created).toBe(false);
});
