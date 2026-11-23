import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import type { RequestDetail } from '@flowdesk/shared';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import es from '../messages/es.json';
import { RequestForm } from '../src/components/request-form';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('../src/i18n/navigation', () => ({ useRouter: () => ({ push }) }));

const user = {
  id: 'employee',
  displayName: 'Laura Méndez',
  jobTitle: 'Marketing',
};
const request: RequestDetail = {
  id: 'request-id',
  code: 'FD-0006',
  softwareName: 'Figma',
  accessLevel: 'read',
  status: 'pending_approval',
  requester: user,
  createdAt: '2026-11-22T15:00:00Z',
  accessDetail: null,
  justification: 'Necesito acceso al equipo.',
  neededBy: null,
  comments: null,
  approver: {
    id: 'approver',
    displayName: 'Diego Rojas',
    jobTitle: 'Jefe de TI',
  },
  assignee: null,
  decisionComment: null,
  decidedAt: null,
  completionNote: null,
  completedBy: null,
  completedAt: null,
  isSample: false,
  events: [],
  allowedActions: [],
};

beforeAll(() => {
  // Radix uses this browser method to keep the active option visible.
  if (!('scrollIntoView' in Element.prototype)) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => {},
    });
  }
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  push.mockClear();
});

function show() {
  const client = new QueryClient();
  client.setQueryData(['requests', 'list'], { items: [] });
  client.setQueryData(['tour'], {
    created: false,
    decided: false,
    assigned: false,
    completed: false,
  });
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <QueryClientProvider client={client}>
        <RequestForm />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return client;
}

async function fill(justification = 'Necesito acceso al equipo.') {
  await userEvent.type(
    screen.getByRole('textbox', { name: /Software/ }),
    'Figma',
  );
  await userEvent.type(
    screen.getByRole('textbox', { name: /Justificación/ }),
    justification,
  );
}

it('renders inside a card with the actions in the footer', () => {
  show();
  const submit = screen.getByRole('button', { name: es.requestForm.submit });
  const form = submit.closest('form');
  const card = form?.closest('[data-slot="card"]');
  expect(card).not.toBeNull();
  expect(card?.classList.contains('max-w-[640px]')).toBe(true);
  expect(submit.closest('[data-slot="card-footer"]')).not.toBeNull();
  expect(form?.querySelector('[data-slot="card-content"]')).not.toBeNull();
});

it('shows accessDetail only for other', async () => {
  show();
  expect(screen.queryByRole('textbox', { name: /Detalle del rol/ })).toBeNull();
  fireEvent.keyDown(screen.getByRole('combobox', { name: /Nivel de acceso/ }), {
    key: 'Enter',
  });
  await userEvent.click(await screen.findByRole('option', { name: 'Otro' }));
  expect(
    screen.getByRole('textbox', { name: /Detalle del rol/ }),
  ).toBeDefined();
  fireEvent.keyDown(screen.getByRole('combobox', { name: /Nivel de acceso/ }), {
    key: 'Enter',
  });
  await userEvent.click(await screen.findByRole('option', { name: 'Lectura' }));
  expect(screen.queryByRole('textbox', { name: /Detalle del rol/ })).toBeNull();
});

it('shows translated too_short on 10-space justification', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  show();
  await fill('          ');
  await userEvent.click(
    screen.getByRole('button', { name: 'Enviar solicitud' }),
  );
  expect(await screen.findByText(es.validation.too_short)).toBeDefined();
  const field = screen.getByRole('textbox', { name: /Justificación/ });
  expect(field.getAttribute('aria-invalid')).toBe('true');
  expect(
    document.getElementById(field.getAttribute('aria-describedby') ?? '')
      ?.textContent,
  ).toContain(es.validation.too_short);
  expect(fetch).not.toHaveBeenCalled();
});

it('disables submit while pending and creates once on double click', async () => {
  let finish: ((response: Response) => void) | undefined;
  const fetch = vi.fn().mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  vi.stubGlobal('fetch', fetch);
  const notice = vi.spyOn(toast, 'success').mockReturnValue('notice');
  const client = show();
  await fill('😀😀😀😀😀😀😀😀😀😀');
  const submit = screen.getByRole('button', { name: 'Enviar solicitud' });
  await userEvent.dblClick(submit);
  expect((submit as HTMLButtonElement).disabled).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(
    '/api/v1/requests',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        softwareName: 'Figma',
        accessLevel: 'read',
        accessDetail: null,
        justification: '😀😀😀😀😀😀😀😀😀😀',
        neededBy: null,
        comments: null,
      }),
    }),
  );
  finish?.(Response.json(request, { status: 201 }));
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith({
      pathname: '/app/requests/[id]',
      params: { id: 'request-id' },
    }),
  );
  expect(notice).toHaveBeenCalled();
  expect(client.getQueryState(['requests', 'list'])?.isInvalidated).toBe(true);
  expect(client.getQueryState(['tour'])?.isInvalidated).toBe(true);
});

it('maps server field errors to fields', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            details: {
              fields: {
                softwareName: ['too_long'],
                neededBy: ['date_in_past'],
              },
            },
          },
        },
        { status: 400 },
      ),
    ),
  );
  show();
  await fill();
  await userEvent.click(
    screen.getByRole('button', { name: 'Enviar solicitud' }),
  );
  expect(await screen.findByText(es.validation.too_long)).toBeDefined();
  expect(await screen.findByText(es.validation.date_in_past)).toBeDefined();
  expect(
    screen
      .getByRole('textbox', { name: /Software/ })
      .getAttribute('aria-invalid'),
  ).toBe('true');
  expect(push).not.toHaveBeenCalled();
});

it('shows QUOTA_EXCEEDED as a translated form error', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { code: 'QUOTA_EXCEEDED', details: {} } },
          { status: 422 },
        ),
      ),
  );
  show();
  await fill();
  await userEvent.click(
    screen.getByRole('button', { name: 'Enviar solicitud' }),
  );
  expect((await screen.findByRole('alert')).textContent).toBe(
    es.errors.QUOTA_EXCEEDED,
  );
});
