import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, apiFetch } from '../src/lib/api-client';

afterEach(() => vi.unstubAllGlobals());

describe('apiFetch', () => {
  it('parses error body into ApiClientError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: 'INVALID_TRANSITION',
              message: 'State changed.',
              details: { status: 'completed' },
            },
          },
          { status: 409 },
        ),
      ),
    );
    const result = apiFetch('/requests/id/assign', { method: 'POST' });
    await expect(result).rejects.toBeInstanceOf(ApiClientError);
    await expect(result).rejects.toMatchObject({
      status: 409,
      code: 'INVALID_TRANSITION',
      details: { status: 'completed' },
    });
  });

  it.each(['POST', 'PUT'])('sends {} on %s without body', async (method) => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    await apiFetch('/session/identity', { method });
    expect(fetch).toHaveBeenCalledWith('/api/v1/session/identity', {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  });

  it('non-JSON 502 becomes INTERNAL_ERROR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })),
    );
    await expect(apiFetch('/session')).rejects.toMatchObject({
      status: 502,
      code: 'INTERNAL_ERROR',
      details: {},
    });
  });

  it('returns successful JSON and sends the provided body', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ activeIdentity: 'employee' }));
    vi.stubGlobal('fetch', fetch);
    await expect(
      apiFetch('/demo/spaces', { method: 'POST', body: { locale: 'es' } }),
    ).resolves.toEqual({ activeIdentity: 'employee' });
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/demo/spaces',
      expect.objectContaining({ body: '{"locale":"es"}' }),
    );
  });
});
