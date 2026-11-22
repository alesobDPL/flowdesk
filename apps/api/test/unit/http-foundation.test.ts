import { randomUUID } from 'node:crypto';
import { buildCreateRequestSchema, type ApiErrorBody } from '@flowdesk/shared';
import cookiePlugin from '@fastify/cookie';
import Fastify, { type FastifyInstance, type InjectOptions } from 'fastify';
import { afterEach, expect, it, vi } from 'vitest';
import { loadConfig, type Config } from '../../src/config.js';
import {
  DomainError,
  type DomainErrorCode,
} from '../../src/core/requests/errors.js';
import type { Db } from '../../src/db/client.js';
import {
  SessionService,
  type ResolvedSession,
} from '../../src/demo/session/session.service.js';
import { DemoCapacityError } from '../../src/demo/spaces/space.service.js';
import { buildApp } from '../../src/http/app.js';
import { newVisitor } from '../helpers/http.js';

const apps: FastifyInstance[] = [];
const execute = vi.fn<Db['execute']>();
const db = { execute } as unknown as Db;
const base = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
  LOG_LEVEL: 'silent',
});
const headers = { origin: base.appOrigin, 'content-type': 'application/json' };

async function appFor(config: Config = base) {
  const app = await buildApp({ config, db });
  apps.push(app);
  // Test-only mutation route; Task 9 owns the actual demo routes.
  app.post('/api/v1/test-mutation', (_request, reply) =>
    reply.send({ status: 'ok' }),
  );
  return app;
}

function errorBody(response: { json: <T>() => T }): ApiErrorBody {
  const body = response.json<ApiErrorBody>();
  expect(body.error.message).toEqual(expect.any(String));
  expect(body.error.details).toEqual(expect.any(Object));
  return body;
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  vi.restoreAllMocks();
  execute.mockReset();
});

it('health returns ok and executes a database probe', async () => {
  execute.mockResolvedValue({
    rows: [],
    rowCount: 1,
    command: 'SELECT',
    oid: 0,
    fields: [],
  });
  const response = await (await appFor()).inject('/api/v1/health');
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: 'ok' });
  expect(execute).toHaveBeenCalledOnce();
});

it('health failure returns a generic 503 error', async () => {
  execute.mockRejectedValue(new Error('private database credentials'));
  const response = await (await appFor()).inject('/api/v1/health');
  expect(response.statusCode).toBe(503);
  expect(errorBody(response).error.code).toBe('INTERNAL_ERROR');
  expect(response.body).not.toContain('credentials');
});

it('protected route without cookie returns 401 SESSION_REQUIRED', async () => {
  const response = await (await appFor()).inject('/api/v1/session');
  expect(response.statusCode).toBe(401);
  expect(errorBody(response).error.code).toBe('SESSION_REQUIRED');
});

it('expired session returns 401 SESSION_EXPIRED without touch', async () => {
  vi.spyOn(SessionService.prototype, 'resolve').mockResolvedValue({
    status: 'expired',
  });
  const touch = vi.spyOn(SessionService.prototype, 'touch').mockResolvedValue();
  const response = await (
    await appFor()
  ).inject({
    url: '/api/v1/session',
    headers: { cookie: 'fd_session=expired' },
  });
  expect(response.statusCode).toBe(401);
  expect(errorBody(response).error.code).toBe('SESSION_EXPIRED');
  expect(touch).not.toHaveBeenCalled();
});

it('valid session is decorated and touched before the handler', async () => {
  const session = { sessionId: 'test-session' } as ResolvedSession;
  vi.spyOn(SessionService.prototype, 'resolve').mockResolvedValue({
    status: 'ok',
    session,
  });
  const touch = vi.spyOn(SessionService.prototype, 'touch').mockResolvedValue();
  const app = await appFor();
  app.get(
    '/api/v1/test-session',
    { preHandler: app.requireSession },
    (request, reply) => reply.send(request.demoSession),
  );
  const response = await app.inject({
    url: '/api/v1/test-session',
    headers: { cookie: 'fd_session=valid' },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(session);
  expect(touch).toHaveBeenCalledWith(session);
});

it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
  '%s rejects missing/foreign Origin and non-JSON before parsing',
  async (method) => {
    const app = await appFor();
    app.route({
      method,
      url: '/api/v1/test-guard',
      handler: (_request, reply) => reply.send({ ok: true }),
    });
    for (const requestHeaders of [
      { 'content-type': 'application/json' },
      { ...headers, origin: 'https://foreign.example' },
      { origin: base.appOrigin },
      { ...headers, 'content-type': 'text/plain' },
      { ...headers, 'content-type': 'application/jsonp' },
    ]) {
      const response = await app.inject({
        method,
        url: '/api/v1/test-guard',
        headers: requestHeaders,
        payload: '{}',
      });
      expect(response.statusCode).toBe(403);
      expect(errorBody(response).error.code).toBe('FORBIDDEN');
    }
    expect(
      (
        await app.inject({
          method,
          url: '/api/v1/test-guard',
          headers: {
            ...headers,
            'content-type': 'application/json; charset=utf-8',
          },
          payload: {},
        })
      ).statusCode,
    ).toBe(200);
  },
);

it('body over 16 KB returns 413 in the standard format', async () => {
  const response = await (
    await appFor()
  ).inject({
    method: 'POST',
    url: '/api/v1/test-mutation',
    headers,
    payload: { text: 'a'.repeat(16384) },
  });
  expect(response.statusCode).toBe(413);
  expect(errorBody(response).error.code).toBe('VALIDATION_ERROR');
});

it('malformed JSON returns 400 VALIDATION_ERROR', async () => {
  const response = await (
    await appFor()
  ).inject({
    method: 'POST',
    url: '/api/v1/test-mutation',
    headers,
    payload: '{',
  });
  expect(response.statusCode).toBe(400);
  expect(errorBody(response).error.code).toBe('VALIDATION_ERROR');
});

it('rate limit returns 429 RATE_LIMITED on the fourth request', async () => {
  const app = await appFor({
    ...base,
    demo: { ...base.demo, rateLimitPerMin: 3 },
  });
  for (let i = 0; i < 3; i++)
    expect((await app.inject('/api/v1/health')).statusCode).toBe(200);
  const response = await app.inject('/api/v1/health');
  expect(response.statusCode).toBe(429);
  expect(errorBody(response).error.code).toBe('RATE_LIMITED');
});

it('global buckets follow the cookie across routes and IPs and isolate different cookies', async () => {
  const app = await appFor({
    ...base,
    demo: { ...base.demo, rateLimitPerMin: 1 },
  });
  const request = (cookie: string, remoteAddress: string, url: string) =>
    app.inject({ url, remoteAddress, headers: { cookie } });
  expect(
    (await request('fd_session=one', '192.0.2.1', '/api/v1/health')).statusCode,
  ).toBe(200);
  expect(
    (await request('fd_session=one', '192.0.2.2', '/api/v1/session'))
      .statusCode,
  ).toBe(429);
  expect(
    (await request('fd_session=two', '192.0.2.1', '/api/v1/health')).statusCode,
  ).toBe(200);
});

it.each([
  ['127.0.0.1/32', '127.0.0.1', 200],
  [null, '127.0.0.1', 429],
  ['127.0.0.1/32', '192.0.2.10', 429],
] as const)(
  'trustProxy %s from %s gives second client status %s',
  async (trustProxyCidr, remoteAddress, expected) => {
    const app = await appFor({
      ...base,
      trustProxyCidr,
      demo: { ...base.demo, rateLimitPerMin: 1 },
    });
    const opts: InjectOptions = {
      method: 'POST',
      url: '/api/v1/test-mutation',
      remoteAddress,
      payload: {},
    };
    expect(
      (
        await app.inject({
          ...opts,
          headers: { ...headers, 'x-forwarded-for': '198.51.100.1' },
        })
      ).statusCode,
    ).toBe(200);
    const response = await app.inject({
      ...opts,
      headers: { ...headers, 'x-forwarded-for': '198.51.100.2' },
    });
    expect(response.statusCode).toBe(expected);
  },
);

it('unknown error returns 500 INTERNAL_ERROR with requestId and no stack', async () => {
  const app = await appFor();
  app.get('/api/v1/test-error', () => {
    throw new Error('private failure');
  });
  const response = await app.inject('/api/v1/test-error');
  expect(response.statusCode).toBe(500);
  const error = errorBody(response).error;
  expect(error.code).toBe('INTERNAL_ERROR');
  expect(error.details.requestId).toEqual(expect.any(String));
  expect(response.body).not.toMatch(/private failure|stack/);
});

it('Zod field errors use stable schema messages', async () => {
  const app = await appFor();
  app.post('/api/v1/test-validation', (request, reply) =>
    reply.send(buildCreateRequestSchema('2026-11-22').parse(request.body)),
  );
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/test-validation',
    headers,
    payload: {
      softwareName: 'x',
      accessLevel: 'other',
      justification: 'x'.repeat(1001),
      neededBy: '2026-11-21',
    },
  });
  expect(response.statusCode).toBe(400);
  expect(errorBody(response).error).toMatchObject({
    code: 'VALIDATION_ERROR',
    details: {
      fields: {
        softwareName: ['too_short'],
        justification: ['too_long'],
        accessDetail: ['required'],
        neededBy: ['date_in_past'],
      },
    },
  });
});

it.each<[DomainErrorCode, number]>([
  ['NOT_FOUND', 404],
  ['FORBIDDEN', 403],
  ['INVALID_TRANSITION', 409],
  ['APPROVER_NOT_CONFIGURED', 422],
  ['SELF_APPROVAL_CONFLICT', 422],
  ['QUOTA_EXCEEDED', 422],
])('maps DomainError %s to %s', async (code, status) => {
  const app = await appFor();
  app.get('/api/v1/test-domain', () => {
    throw new DomainError(code, 'Domain rule failed.');
  });
  const response = await app.inject('/api/v1/test-domain');
  expect(response.statusCode).toBe(status);
  expect(errorBody(response).error.code).toBe(code);
});

it('maps demo capacity to 503 DEMO_AT_CAPACITY', async () => {
  const app = await appFor();
  app.get('/api/v1/test-capacity', () => {
    throw new DemoCapacityError();
  });
  const response = await app.inject('/api/v1/test-capacity');
  expect(response.statusCode).toBe(503);
  expect(errorBody(response).error.code).toBe('DEMO_AT_CAPACITY');
});

it('unknown routes use the standard 404 body', async () => {
  const response = await (await appFor()).inject('/api/v1/unknown');
  expect(response.statusCode).toBe(404);
  expect(errorBody(response).error.code).toBe('NOT_FOUND');
});

it.each([
  ['/api/v1/session', 401],
  ['/api/v1/health', 200],
  ['/api/v1/unknown', 404],
] as const)(
  'IP limit cannot be bypassed by rotating cookies on %s',
  async (url, expected) => {
    const resolve = vi
      .spyOn(SessionService.prototype, 'resolve')
      .mockResolvedValue({ status: 'missing' });
    const app = await appFor({
      ...base,
      demo: { ...base.demo, rateLimitPerMin: 100, ipRateLimitPerMin: 3 },
    });
    for (let i = 0; i < 3; i++) {
      const response = await app.inject({
        url,
        headers: { cookie: `fd_session=${randomUUID()}` },
      });
      expect(response.statusCode).toBe(expected);
    }
    const response = await app.inject({
      url,
      headers: { cookie: `fd_session=${randomUUID()}` },
    });
    expect(response.statusCode).toBe(429);
    expect(errorBody(response).error.code).toBe('RATE_LIMITED');
    if (url.endsWith('/session')) expect(resolve).toHaveBeenCalledTimes(3);
  },
);

it('one IP bucket is shared across health, unknown and protected routes', async () => {
  const resolve = vi
    .spyOn(SessionService.prototype, 'resolve')
    .mockResolvedValue({ status: 'missing' });
  const app = await appFor({
    ...base,
    demo: { ...base.demo, rateLimitPerMin: 100, ipRateLimitPerMin: 3 },
  });
  for (const url of ['/api/v1/health', '/unknown', '/api/v1/session']) {
    await app.inject({
      url,
      headers: { cookie: `fd_session=${randomUUID()}` },
    });
  }
  const response = await app.inject({
    url: '/api/v1/session',
    headers: { cookie: `fd_session=${randomUUID()}` },
  });
  expect(response.statusCode).toBe(429);
  expect(errorBody(response).error.code).toBe('RATE_LIMITED');
  expect(resolve).toHaveBeenCalledOnce();
});

it.each([
  ['127.0.0.1/32', '127.0.0.1', 401],
  [null, '127.0.0.1', 429],
  ['127.0.0.1/32', '192.0.2.10', 429],
] as const)(
  'IP limiter uses trustProxy %s from %s',
  async (trustProxyCidr, remoteAddress, expected) => {
    vi.spyOn(SessionService.prototype, 'resolve').mockResolvedValue({
      status: 'missing',
    });
    const app = await appFor({
      ...base,
      trustProxyCidr,
      demo: { ...base.demo, rateLimitPerMin: 100, ipRateLimitPerMin: 3 },
    });
    const request = (ip: string) =>
      app.inject({
        url: '/api/v1/session',
        remoteAddress,
        headers: {
          cookie: `fd_session=${randomUUID()}`,
          'x-forwarded-for': ip,
        },
      });
    for (let i = 0; i < 3; i++)
      expect((await request('198.51.100.1')).statusCode).toBe(401);
    expect((await request('198.51.100.1')).statusCode).toBe(429);
    expect((await request('198.51.100.2')).statusCode).toBe(expected);
  },
);

it('visitor helper passes locale, configured origin, cookie and default POST/PUT bodies', async () => {
  const config = { ...base, appOrigin: 'https://flowdesk.example' };
  const app = Fastify();
  app.decorate('config', config);
  await app.register(cookiePlugin);
  apps.push(app);
  const created: unknown[] = [];
  // Isolated fixture for the helper, independent of the application's demo route.
  app.post('/api/v1/demo/spaces', (request, reply) => {
    created.push(request.body);
    return reply.code(201).setCookie('fd_session', 'visitor-token').send({});
  });
  for (const method of ['GET', 'POST', 'PUT'] as const) {
    app.route({
      method,
      url: '/api/v1/test-visitor',
      handler: (request, reply) =>
        reply.send({
          cookie: request.headers.cookie,
          origin: request.headers.origin,
          body: request.body ?? null,
        }),
    });
  }
  const visitor = await newVisitor(app, 'en');
  expect(created).toEqual([{ locale: 'en' }]);
  expect(visitor.cookie).toBe('fd_session=visitor-token');
  for (const method of ['POST', 'PUT'] as const) {
    const response = await visitor.inject({
      method,
      url: '/api/v1/test-visitor',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      cookie: visitor.cookie,
      origin: config.appOrigin,
      body: {},
    });
  }
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: '/api/v1/test-visitor',
        payload: { value: 1 },
      })
    ).json(),
  ).toMatchObject({ body: { value: 1 } });
  await newVisitor(app);
  expect(created[1]).toEqual({ locale: 'es' });
});

it('application close stops the optional cleanup scheduler', async () => {
  vi.useFakeTimers();
  try {
    const before = vi.getTimerCount();
    const app = await buildApp({ config: base, db, startScheduler: true });
    apps.push(app);
    expect(vi.getTimerCount()).toBe(before + 1);
    await app.close();
    expect(vi.getTimerCount()).toBe(before);
  } finally {
    vi.useRealTimers();
  }
});
