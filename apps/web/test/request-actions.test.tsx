import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { afterEach, expect, it, vi } from 'vitest';
import es from '../messages/es.json';
import { RequestActions } from '../src/components/request-actions';
import { useRequest } from '../src/lib/queries';
import { request } from './helpers/request';
import type { ReactNode } from 'react';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function show(content: ReactNode = <RequestActions request={request} />) {
  const client = new QueryClient();
  client.setQueryData(['requests', 'list', { view: 'queue' }], { items: [] });
  client.setQueryData(['tour'], {
    created: true,
    decided: true,
    assigned: false,
    completed: false,
  });
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <QueryClientProvider client={client}>{content}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return client;
}

it('renders only allowedActions', () => {
  show();
  expect(
    screen.getAllByRole('button').map((button) => button.textContent),
  ).toEqual(['Asignarme']);
});

it('renders nothing when no action or error is available', () => {
  show(<RequestActions request={{ ...request, allowedActions: [] }} />);
  expect(screen.queryByRole('heading')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
  expect(document.querySelector('[data-slot="card"]')).toBeNull();
  expect(document.body.textContent).toBe('');
});

it('keeps the dialog locked while an action is pending', async () => {
  let finish: ((value: Response) => void) | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    ),
  );
  show(
    <RequestActions request={{ ...request, allowedActions: ['complete'] }} />,
  );
  await userEvent.click(
    screen.getByRole('button', { name: es.actions.complete }),
  );
  const dialog = screen.getByRole('dialog');
  await userEvent.click(
    within(dialog).getByRole('button', { name: es.actions.complete }),
  );
  expect(
    within(dialog).getByRole<HTMLTextAreaElement>('textbox').disabled,
  ).toBe(true);
  expect(
    within(dialog).getByRole<HTMLButtonElement>('button', {
      name: es.app.cancel,
    }).disabled,
  ).toBe(true);
  expect(
    within(dialog).queryByRole('button', { name: es.common.close }),
  ).toBeNull();
  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('dialog')).toBe(dialog);
  finish?.(Response.json(request));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('returns focus to the action button when the dialog is cancelled', async () => {
  show(<RequestActions request={{ ...request, allowedActions: ['reject'] }} />);
  const trigger = screen.getByRole('button', { name: 'Rechazar' });
  await userEvent.click(trigger);
  const dialog = screen.getByRole('dialog');
  expect(document.activeElement).toBe(within(dialog).getByRole('textbox'));
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Cancelar' }),
  );
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});

it('reject requires 10+ trimmed characters before confirm is enabled', async () => {
  show(
    <RequestActions
      request={{
        ...request,
        status: 'pending_approval',
        allowedActions: ['reject'],
      }}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
  const dialog = screen.getByRole('dialog');
  const text = within(dialog).getByRole('textbox');
  const confirm = within(dialog).getByRole<HTMLButtonElement>('button', {
    name: 'Rechazar',
  });
  expect(confirm.disabled).toBe(true);
  await userEvent.type(text, '          ');
  expect(confirm.disabled).toBe(true);
  await userEvent.clear(text);
  await userEvent.type(text, '123456789');
  expect(confirm.disabled).toBe(true);
  await userEvent.type(text, '0');
  expect(confirm.disabled).toBe(false);
  await userEvent.clear(text);
  await userEvent.type(text, '😀😀😀😀😀😀😀😀😀😀');
  expect(confirm.disabled).toBe(false);
  fireEvent.change(text, { target: { value: 'x'.repeat(501) } });
  expect(confirm.disabled).toBe(true);
});

it('assign sends {} once on double click and invalidates detail, lists and tour', async () => {
  let finish: ((value: Response) => void) | undefined;
  const fetch = vi.fn().mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal('fetch', fetch);
  const client = show();
  client.setQueryData(['requests', 'detail', request.id], request);
  const button = screen.getByRole<HTMLButtonElement>('button', {
    name: 'Asignarme',
  });
  await userEvent.dblClick(button);
  expect(button.disabled).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/requests/request-id/assign',
    expect.objectContaining({ method: 'POST', body: '{}' }),
  );
  finish?.(
    Response.json({
      ...request,
      status: 'in_progress',
      allowedActions: ['release', 'complete'],
    }),
  );
  await waitFor(() =>
    expect(client.getQueryState(['tour'])?.isInvalidated).toBe(true),
  );
  expect(
    client.getQueryState(['requests', 'list', { view: 'queue' }])
      ?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(['requests', 'detail', request.id])?.isInvalidated,
  ).toBe(true);
});

function DetailActions() {
  const detail = useRequest(request.id);
  return detail.data ? <RequestActions request={detail.data} /> : null;
}

it('on 409 shows a changed notice and refetches the detail', async () => {
  let reads = 0;
  const fetch = vi.fn().mockImplementation((_path: string, init: RequestInit) =>
    Promise.resolve(
      init.method === 'POST'
        ? Response.json(
            {
              error: {
                code: 'INVALID_TRANSITION',
                message: 'State changed.',
                details: {},
              },
            },
            { status: 409 },
          )
        : Response.json(
            ++reads === 1 ? request : { ...request, allowedActions: [] },
          ),
    ),
  );
  vi.stubGlobal('fetch', fetch);
  const notice = vi.spyOn(toast, 'info').mockReturnValue('notice');
  show(<DetailActions />);
  await userEvent.click(
    await screen.findByRole('button', { name: 'Asignarme' }),
  );
  await waitFor(() => expect(notice).toHaveBeenCalled());
  expect(reads).toBe(2);
  expect(screen.queryByRole('button', { name: 'Asignarme' })).toBeNull();
});

it('release sends a trimmed reason once while confirmation is pending', async () => {
  let finish: ((value: Response) => void) | undefined;
  const fetch = vi.fn().mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal('fetch', fetch);
  show(
    <RequestActions
      request={{
        ...request,
        status: 'in_progress',
        allowedActions: ['release'],
      }}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Liberar' }));
  const dialog = screen.getByRole('dialog');
  await userEvent.type(
    within(dialog).getByRole('textbox'),
    '  Otro técnico debe continuar.  ',
  );
  const confirm = within(dialog).getByRole<HTMLButtonElement>('button', {
    name: 'Liberar',
  });
  await userEvent.dblClick(confirm);
  expect(confirm.disabled).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/requests/request-id/release',
    expect.objectContaining({
      body: '{"reason":"Otro técnico debe continuar."}',
    }),
  );
  finish?.(Response.json(request));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it.each([
  { action: 'approve' as const, label: 'Aprobar', key: 'comment' },
  { action: 'complete' as const, label: 'Completar', key: 'note' },
])(
  '$action accepts an empty optional note and enforces the 500-character limit',
  async ({ action, label, key }) => {
    const fetch = vi.fn().mockResolvedValue(Response.json(request));
    vi.stubGlobal('fetch', fetch);
    show(<RequestActions request={{ ...request, allowedActions: [action] }} />);
    await userEvent.click(screen.getByRole('button', { name: label }));
    const dialog = screen.getByRole('dialog');
    const text = within(dialog).getByRole('textbox');
    const confirm = within(dialog).getByRole<HTMLButtonElement>('button', {
      name: label,
    });
    expect(confirm.disabled).toBe(false);
    fireEvent.change(text, { target: { value: 'x'.repeat(501) } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(text, { target: { value: '😀'.repeat(500) } });
    expect(confirm.disabled).toBe(false);
    fireEvent.change(text, { target: { value: '   ' } });
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        `/api/v1/requests/request-id/${action}`,
        expect.objectContaining({ body: JSON.stringify({ [key]: null }) }),
      ),
    );
  },
);
