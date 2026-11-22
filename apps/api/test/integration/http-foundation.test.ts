import type { ApiErrorBody } from '@flowdesk/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { demoSpaces } from '../../src/db/schema.js';
import { SessionService } from '../../src/demo/session/session.service.js';
import { DemoSpaceService } from '../../src/demo/spaces/space.service.js';
import { buildApp } from '../../src/http/app.js';
import { getTestDb } from '../helpers/test-db.js';

const config = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
  LOG_LEVEL: 'silent',
});
const start = new Date('2026-11-22T15:00:00Z');
let now: Date;
let app: FastifyInstance;

beforeEach(async () => {
  const db = getTestDb();
  await db.delete(demoSpaces);
  now = new Date(start);
  app = await buildApp({ config, db, clock: () => now });
  app.post('/api/v1/test-mutation', (_request, reply) =>
    reply.send({ status: 'ok' }),
  );
});
afterEach(async () => {
  await app?.close();
});

it('health returns ok against PostgreSQL', async () => {
  const response = await app.inject('/api/v1/health');
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ status: 'ok' });
});

it('protected route without cookie returns 401 SESSION_REQUIRED', async () => {
  const response = await app.inject('/api/v1/session');
  expect(response.statusCode).toBe(401);
  expect(response.json<ApiErrorBody>().error.code).toBe('SESSION_REQUIRED');
});

it('expired session returns 401 SESSION_EXPIRED', async () => {
  const { token } = await new DemoSpaceService(
    getTestDb(),
    config,
    () => now,
  ).create('es');
  now = new Date(start.getTime() + 30 * 60_000);
  const response = await app.inject({
    url: '/api/v1/session',
    headers: { cookie: `fd_session=${token}` },
  });
  expect(response.statusCode).toBe(401);
  expect(response.json<ApiErrorBody>().error.code).toBe('SESSION_EXPIRED');
});

it('valid cookie resolves a scoped session and touches activity', async () => {
  const db = getTestDb();
  const { token } = await new DemoSpaceService(db, config, () => now).create(
    'en',
  );
  const result = await new SessionService(db, config, () => now).resolve(token);
  if (result.status !== 'ok') throw new Error('Expected session.');
  now = new Date(start.getTime() + 2 * 60_000);
  const response = await app.inject({
    url: '/api/v1/session',
    headers: { cookie: `fd_session=${token}` },
  });
  expect(response.statusCode).toBe(200);
  const [space] = await db
    .select()
    .from(demoSpaces)
    .where(eq(demoSpaces.id, result.session.spaceId));
  expect(space?.lastSeenAt).toEqual(now);
});

it.each([
  { 'content-type': 'application/json' },
  { origin: 'https://foreign.example', 'content-type': 'application/json' },
  { origin: config.appOrigin, 'content-type': 'text/plain' },
  { origin: config.appOrigin },
])('mutation rejects invalid headers %j', async (headers) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/test-mutation',
    headers,
    payload: '{}',
  });
  expect(response.statusCode).toBe(403);
  expect(response.json<ApiErrorBody>().error.code).toBe('FORBIDDEN');
});

it('allows an empty JSON object', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/test-mutation',
    headers: { origin: config.appOrigin, 'content-type': 'application/json' },
    payload: {},
  });
  expect(response.statusCode).toBe(200);
});

it('body over 16 KB returns 413 with the standard error body', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/test-mutation',
    headers: { origin: config.appOrigin, 'content-type': 'application/json' },
    payload: { text: 'a'.repeat(16384) },
  });
  expect(response.statusCode).toBe(413);
  expect(response.json<ApiErrorBody>().error.code).toBe('VALIDATION_ERROR');
});

it('rate limit returns 429 RATE_LIMITED with an error body', async () => {
  await app.close();
  app = await buildApp({
    config: { ...config, demo: { ...config.demo, rateLimitPerMin: 3 } },
    db: getTestDb(),
  });
  for (let i = 0; i < 3; i++)
    expect((await app.inject('/api/v1/health')).statusCode).toBe(200);
  const response = await app.inject('/api/v1/health');
  expect(response.statusCode).toBe(429);
  expect(response.json<ApiErrorBody>().error).toMatchObject({
    code: 'RATE_LIMITED',
    details: {},
  });
});

it('unknown error returns 500 INTERNAL_ERROR without stack', async () => {
  app.get('/api/v1/test-error', () => {
    throw new Error('private failure');
  });
  const response = await app.inject('/api/v1/test-error');
  expect(response.statusCode).toBe(500);
  const error = response.json<ApiErrorBody>().error;
  expect(error.code).toBe('INTERNAL_ERROR');
  expect(error.details.requestId).toEqual(expect.any(String));
  expect(response.body).not.toMatch(/stack|private failure/);
});

it.each([
  ['127.0.0.1/32', '127.0.0.1', 200],
  [null, '127.0.0.1', 429],
  ['127.0.0.1/32', '192.0.2.10', 429],
] as const)(
  'trustProxy %s from %s gives second client status %s',
  async (trustProxyCidr, remoteAddress, expected) => {
    await app.close();
    app = await buildApp({
      config: {
        ...config,
        trustProxyCidr,
        demo: { ...config.demo, rateLimitPerMin: 1 },
      },
      db: getTestDb(),
    });
    app.post('/api/v1/test-mutation', (_request, reply) =>
      reply.send({ status: 'ok' }),
    );
    const opts: InjectOptions = {
      method: 'POST',
      url: '/api/v1/test-mutation',
      remoteAddress,
      payload: {},
    };
    const headers = {
      origin: config.appOrigin,
      'content-type': 'application/json',
    };
    expect(
      (
        await app.inject({
          ...opts,
          headers: { ...headers, 'x-forwarded-for': '198.51.100.1' },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          ...opts,
          headers: { ...headers, 'x-forwarded-for': '198.51.100.2' },
        })
      ).statusCode,
    ).toBe(expected);
  },
);
