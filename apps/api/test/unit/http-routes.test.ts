import { randomUUID } from 'node:crypto';
import type { ApiErrorBody, SessionInfo } from '@flowdesk/shared';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loadConfig, type Config } from '../../src/config.js';
import { RequestService } from '../../src/core/requests/service.js';
import type { Db } from '../../src/db/client.js';
import {
  SessionService,
  type ResolvedSession,
} from '../../src/demo/session/session.service.js';
import { DemoSpaceService } from '../../src/demo/spaces/space.service.js';
import * as tour from '../../src/demo/tour/tour.service.js';
import { buildApp } from '../../src/http/app.js';

const config = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
  LOG_LEVEL: 'silent',
});
const now = new Date('2026-11-23T02:30:00Z');
const hardExpiresAt = new Date(now.getTime() + 7200_000);
const session: ResolvedSession = {
  sessionId: randomUUID(),
  spaceId: randomUUID(),
  actor: { userId: randomUUID(), scopeId: randomUUID(), roles: ['requester'] },
  activeIdentity: 'employee',
  hardExpiresAt,
  lastSeenAt: now,
};
const info: SessionInfo = {
  activeIdentity: 'employee',
  user: {
    id: session.actor.userId,
    displayName: 'Employee',
    jobTitle: 'Employee',
  },
  roles: ['requester'],
  identities: [],
  expiresAt: new Date(now.getTime() + 1800_000).toISOString(),
};
const headers = {
  origin: config.appOrigin,
  'content-type': 'application/json',
};
const auth = { ...headers, cookie: 'fd_session=valid' };
const db = {} as Db;
const apps: FastifyInstance[] = [];

async function makeApp(override: Config = config) {
  const app = await buildApp({ config: override, db, clock: () => now });
  apps.push(app);
  return app;
}

function mockServices() {
  vi.spyOn(SessionService.prototype, 'resolve').mockImplementation((token) =>
    Promise.resolve(
      token === undefined ? { status: 'missing' } : { status: 'ok', session },
    ),
  );
  const touch = vi.spyOn(SessionService.prototype, 'touch').mockResolvedValue();
  vi.spyOn(SessionService.prototype, 'info').mockResolvedValue(info);
  const switchIdentity = vi
    .spyOn(SessionService.prototype, 'switchIdentity')
    .mockResolvedValue(info);
  const create = vi
    .spyOn(DemoSpaceService.prototype, 'create')
    .mockResolvedValue({
      token: 'created',
      hardExpiresAt,
    });
  const reset = vi
    .spyOn(DemoSpaceService.prototype, 'reset')
    .mockResolvedValue({
      token: 'reset',
      hardExpiresAt,
    });
  return { touch, switchIdentity, create, reset };
}
let services: ReturnType<typeof mockServices>;
beforeEach(() => {
  services = mockServices();
});
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  vi.restoreAllMocks();
});

it('create and reset share one IP bucket across cookie rotation, while other IPs are independent', async () => {
  const app = await makeApp({
    ...config,
    demo: { ...config.demo, spacesPerIpHour: 2 },
  });
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/demo/spaces',
        headers,
        payload: { locale: 'en' },
      })
    ).statusCode,
  ).toBe(201);
  const reset = await app.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces/reset',
    headers: auth,
    payload: { locale: 'es' },
  });
  expect(reset.statusCode).toBe(201);
  const limited = await app.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces/reset',
    headers: { ...auth, cookie: 'fd_session=reset' },
    payload: { locale: 'es' },
  });
  expect(limited.statusCode).toBe(429);
  expect(limited.json<ApiErrorBody>().error.code).toBe('RATE_LIMITED');
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/api/v1/demo/spaces',
        remoteAddress: '192.0.2.1',
        headers,
        payload: { locale: 'es' },
      })
    ).statusCode,
  ).toBe(201);
});

it('two resumes do not consume the actual creation quota', async () => {
  const app = await makeApp({
    ...config,
    demo: { ...config.demo, spacesPerIpHour: 1 },
  });
  const opts = {
    method: 'POST',
    url: '/api/v1/demo/spaces',
    payload: { locale: 'es' },
  } as const;
  expect((await app.inject({ ...opts, headers })).statusCode).toBe(201);
  for (let i = 0; i < 2; i++) {
    const response = await app.inject({
      ...opts,
      headers: { ...auth, cookie: 'fd_session=created' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(info);
    expect(response.headers['set-cookie']).toBeUndefined();
  }
  const limited = await app.inject({ ...opts, headers });
  expect(limited.statusCode).toBe(429);
  expect(limited.json<ApiErrorBody>().error.code).toBe('RATE_LIMITED');
  expect(services.create).toHaveBeenCalledOnce();
});

it('the global per-minute limit still applies to demo routes', async () => {
  const app = await makeApp({
    ...config,
    demo: { ...config.demo, rateLimitPerMin: 1, spacesPerIpHour: 10 },
  });
  expect(
    (await app.inject({ url: '/api/v1/session', headers: auth })).statusCode,
  ).toBe(200);
  const limited = await app.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces/reset',
    headers: auth,
    payload: { locale: 'es' },
  });
  expect(limited.statusCode).toBe(429);
  expect(limited.json<ApiErrorBody>().error.code).toBe('RATE_LIMITED');
  expect(services.reset).not.toHaveBeenCalled();
});

it.each(['development', 'production'] as const)(
  'sets the configured cookie only on creation/reset (%s)',
  async (nodeEnv) => {
    const app = await makeApp({ ...config, nodeEnv });
    for (const path of ['/demo/spaces', '/demo/spaces/reset']) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1${path}`,
        headers: path.endsWith('reset') ? auth : headers,
        payload: { locale: 'en' },
      });
      expect(response.statusCode).toBe(201);
      const cookie = response.cookies.find(
        (entry) => entry.name === 'fd_session',
      );
      expect(cookie).toMatchObject({
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: 7200,
      });
      expect(Boolean(cookie?.secure)).toBe(nodeEnv === 'production');
      expect(cookie?.domain).toBeUndefined();
      expect(response.json()).toEqual(info);
    }
    const resume = await app.inject({
      method: 'POST',
      url: '/api/v1/demo/spaces',
      headers: auth,
      payload: { locale: 'es' },
    });
    expect(resume.statusCode).toBe(200);
    expect(resume.json()).toEqual(info);
    expect(resume.headers['set-cookie']).toBeUndefined();
    expect(services.touch).toHaveBeenCalledWith(session);
    expect(services.create).toHaveBeenCalledOnce();
  },
);

it('validates locale and identity before mutating services', async () => {
  const app = await makeApp();
  for (const path of [
    '/demo/spaces',
    '/demo/spaces/reset',
    '/session/identity',
  ]) {
    const response = await app.inject({
      method: path.includes('identity') ? 'PUT' : 'POST',
      url: `/api/v1${path}`,
      headers: auth,
      payload: {},
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().error.code).toBe('VALIDATION_ERROR');
  }
  expect(services.create).not.toHaveBeenCalled();
  expect(services.reset).not.toHaveBeenCalled();
  expect(services.switchIdentity).not.toHaveBeenCalled();
});

it.each([
  'GET /session',
  'PUT /session/identity',
  'POST /demo/spaces/reset',
  'GET /requests?view=mine',
  'POST /requests',
  `GET /requests/${randomUUID()}`,
  ...['approve', 'reject', 'assign', 'release', 'complete'].map(
    (action) => `POST /requests/${randomUUID()}/${action}`,
  ),
  'GET /demo/tour',
])('%s requires a session', async (route) => {
  const [method, path] = route.split(' ');
  const app = await makeApp();
  const response = await app.inject({
    method: method as 'GET' | 'POST' | 'PUT',
    url: `/api/v1${path}`,
    headers,
    payload: method === 'GET' ? undefined : {},
  });
  expect(response.statusCode).toBe(401);
  expect(response.json<ApiErrorBody>().error.code).toBe('SESSION_REQUIRED');
});

it.each(['detail', 'approve', 'reject', 'assign', 'release', 'complete'])(
  'invalid UUID for %s is 404 before a service call',
  async (action) => {
    const method =
      action === 'detail'
        ? 'get'
        : (action as 'approve' | 'reject' | 'assign' | 'release' | 'complete');
    const service = vi.spyOn(RequestService.prototype, method);
    const app = await makeApp();
    const response = await app.inject({
      method: action === 'detail' ? 'GET' : 'POST',
      url: `/api/v1/requests/invalid${action === 'detail' ? '' : `/${action}`}`,
      headers: auth,
      payload: action === 'detail' ? undefined : {},
    });
    expect(response.statusCode).toBe(404);
    expect(response.json<ApiErrorBody>().error.code).toBe('NOT_FOUND');
    expect(service).not.toHaveBeenCalled();
  },
);

it.each([
  '',
  '!',
  Buffer.from('invalid').toString('base64url'),
  Buffer.from(`2026-02-30T00:00:00.000Z|${randomUUID()}`).toString('base64url'),
  Buffer.from(`2026-11-22T00:00:00.000Z|bad-uuid`).toString('base64url'),
  Buffer.from(`2026-11-22T00:00:00.000Z|${randomUUID()}|extra`).toString(
    'base64url',
  ),
])('rejects invalid cursor %s before RequestService', async (cursor) => {
  const service = vi.spyOn(RequestService.prototype, 'list');
  const app = await makeApp();
  const response = await app.inject({
    url: `/api/v1/requests?view=mine&cursor=${encodeURIComponent(cursor)}`,
    headers: auth,
  });
  expect(response.statusCode).toBe(400);
  expect(response.json<ApiErrorBody>().error.code).toBe('VALIDATION_ERROR');
  expect(response.json<ApiErrorBody>().error.details).toHaveProperty(
    'fields.cursor',
  );
  expect(service).not.toHaveBeenCalled();
});

it('passes a valid cursor and only the resolved Actor to the list service', async () => {
  const list = vi
    .spyOn(RequestService.prototype, 'list')
    .mockResolvedValue({ items: [], nextCursor: null });
  const app = await makeApp();
  const cursor = Buffer.from(
    `2026-11-22T00:00:00.000Z|${randomUUID()}`,
  ).toString('base64url');
  const response = await app.inject({
    url: `/api/v1/requests?view=mine&q=&cursor=${cursor}&scopeId=foreign`,
    headers: auth,
  });
  expect(response.statusCode).toBe(200);
  expect(list).toHaveBeenCalledWith(session.actor, {
    view: 'mine',
    q: '',
    cursor,
  });
});

it('validates creation against the injected Santiago date before calling the service', async () => {
  const create = vi
    .spyOn(RequestService.prototype, 'create')
    .mockRejectedValue(new Error('Service sentinel'));
  const app = await makeApp();
  const payload = {
    softwareName: 'Figma',
    accessLevel: 'read',
    justification: 'A valid justification.',
    neededBy: '2026-11-21',
  };
  const invalid = await app.inject({
    method: 'POST',
    url: '/api/v1/requests',
    headers: auth,
    payload,
  });
  expect(invalid.statusCode).toBe(400);
  expect(invalid.json<ApiErrorBody>().error.details).toHaveProperty(
    'fields.neededBy',
    ['date_in_past'],
  );
  expect(create).not.toHaveBeenCalled();
  await app.inject({
    method: 'POST',
    url: '/api/v1/requests',
    headers: auth,
    payload: {
      ...payload,
      neededBy: '2026-11-22',
      actor: { userId: 'forged' },
    },
  });
  expect(create).toHaveBeenCalledWith(session.actor, {
    softwareName: 'Figma',
    accessLevel: 'read',
    justification: 'A valid justification.',
    neededBy: '2026-11-22',
    accessDetail: null,
    comments: null,
  });
});

it('tour reads only the resolved scope', async () => {
  const progress = {
    created: true,
    decided: false,
    assigned: false,
    completed: false,
  };
  const get = vi.spyOn(tour, 'getTourProgress').mockResolvedValue(progress);
  const app = await makeApp();
  const response = await app.inject({
    url: '/api/v1/demo/tour?scopeId=foreign',
    headers: auth,
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(progress);
  expect(get).toHaveBeenCalledWith(db, session.actor.scopeId);
});
