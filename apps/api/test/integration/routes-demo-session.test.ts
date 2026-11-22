import type { ApiErrorBody, SessionInfo } from '@flowdesk/shared';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { demoSpaces } from '../../src/db/schema.js';
import { buildApp } from '../../src/http/app.js';
import { newVisitor } from '../helpers/http.js';
import { getTestDb } from '../helpers/test-db.js';

const config = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
  LOG_LEVEL: 'silent',
});
const start = new Date('2026-11-23T02:30:00Z');
const headers = {
  origin: config.appOrigin,
  'content-type': 'application/json',
};
let app: FastifyInstance;
let now: Date;

beforeEach(async () => {
  await getTestDb().delete(demoSpaces);
  now = new Date(start);
  app = await buildApp({ config, db: getTestDb(), clock: () => now });
});
afterEach(async () => {
  await app?.close();
});

it.each(['development', 'production'] as const)(
  'create sets HttpOnly SameSite=Lax cookie and returns employee (%s)',
  async (nodeEnv) => {
    await app.close();
    app = await buildApp({
      config: { ...config, nodeEnv },
      db: getTestDb(),
      clock: () => now,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/demo/spaces',
      headers,
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
    expect(cookie?.domain).toBeUndefined();
    expect(Boolean(cookie?.secure)).toBe(nodeEnv === 'production');
    const info = response.json<SessionInfo>();
    expect(info.activeIdentity).toBe('employee');
    expect(info.roles).toEqual(['requester']);
    expect(info.identities.map((entry) => entry.identity)).toEqual([
      'employee',
      'approver',
      'it_agent',
    ]);
    expect(info.expiresAt).toBe(
      new Date(start.getTime() + 30 * 60_000).toISOString(),
    );
  },
);

it('create with valid session resumes (200, same expiresAt, no new space row)', async () => {
  const visitor = await newVisitor(app);
  const initial = (
    await visitor.inject({ url: '/api/v1/session' })
  ).json<SessionInfo>();
  const response = await visitor.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces',
    payload: { locale: 'en' },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual(initial);
  expect(response.headers['set-cookie']).toBeUndefined();
  expect(await getTestDb().select().from(demoSpaces)).toHaveLength(1);
});

it('reset returns new cookie; old cookie returns 401', async () => {
  const visitor = await newVisitor(app);
  const response = await visitor.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces/reset',
    payload: { locale: 'en' },
  });
  expect(response.statusCode).toBe(201);
  const cookie = response.cookies.find((entry) => entry.name === 'fd_session');
  expect(cookie?.value).toBeTruthy();
  expect(`fd_session=${cookie?.value}`).not.toBe(visitor.cookie);
  const old = await visitor.inject({ url: '/api/v1/session' });
  expect(old.statusCode).toBe(401);
  expect(old.json<ApiErrorBody>().error.code).toBe('SESSION_EXPIRED');
  expect(
    (
      await app.inject({
        url: '/api/v1/session',
        headers: { cookie: `fd_session=${cookie?.value}` },
      })
    ).json<SessionInfo>().activeIdentity,
  ).toBe('employee');
});

it('switch identity to approver and use it on subsequent requests without renewing cookie', async () => {
  const visitor = await newVisitor(app);
  const response = await visitor.inject({
    method: 'PUT',
    url: '/api/v1/session/identity',
    payload: { identity: 'approver' },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json<SessionInfo>().roles).toEqual(['approver']);
  expect(response.headers['set-cookie']).toBeUndefined();
  const current = await visitor.inject({ url: '/api/v1/session' });
  expect(current.json<SessionInfo>().activeIdentity).toBe('approver');
  expect(current.headers['set-cookie']).toBeUndefined();
});

it('switch identity with unknown value returns 400', async () => {
  const visitor = await newVisitor(app);
  const response = await visitor.inject({
    method: 'PUT',
    url: '/api/v1/session/identity',
    payload: { identity: 'admin' },
  });
  expect(response.statusCode).toBe(400);
  expect(response.json<ApiErrorBody>().error).toMatchObject({
    code: 'VALIDATION_ERROR',
    details: { fields: { identity: ['required'] } },
  });
});

it('11th space creation from same IP within an hour returns 429', async () => {
  for (let i = 0; i < 10; i++)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/demo/spaces',
          headers,
          payload: { locale: 'es' },
        })
      ).statusCode,
    ).toBe(201);
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces',
    headers,
    payload: { locale: 'es' },
  });
  expect(response.statusCode).toBe(429);
  expect(response.json<ApiErrorBody>().error.code).toBe('RATE_LIMITED');
});

it('create and reset count against the same IP bucket', async () => {
  await app.close();
  app = await buildApp({
    config: { ...config, demo: { ...config.demo, spacesPerIpHour: 2 } },
    db: getTestDb(),
    clock: () => now,
  });
  const visitor = await newVisitor(app);
  const reset = await visitor.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces/reset',
    payload: { locale: 'es' },
  });
  expect(reset.statusCode).toBe(201);
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces',
    headers,
    payload: { locale: 'es' },
  });
  expect(response.statusCode).toBe(429);
  expect(response.json<ApiErrorBody>().error.code).toBe('RATE_LIMITED');
  expect(await getTestDb().select().from(demoSpaces)).toHaveLength(2);
});

it('resumes twice without consuming the spacesPerIpHour=1 creation bucket', async () => {
  await app.close();
  app = await buildApp({
    config: { ...config, demo: { ...config.demo, spacesPerIpHour: 1 } },
    db: getTestDb(),
    clock: () => now,
  });
  const visitor = await newVisitor(app);
  for (let i = 0; i < 2; i++) {
    const response = await visitor.inject({
      method: 'POST',
      url: '/api/v1/demo/spaces',
      payload: { locale: 'es' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<SessionInfo>().activeIdentity).toBe('employee');
    expect(response.headers['set-cookie']).toBeUndefined();
  }
  const limited = await app.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces',
    headers,
    payload: { locale: 'es' },
  });
  expect(limited.statusCode).toBe(429);
  expect(limited.json<ApiErrorBody>().error.code).toBe('RATE_LIMITED');
  expect(await getTestDb().select().from(demoSpaces)).toHaveLength(1);
});

it('validates locale for create and reset, and reset requires a session', async () => {
  const missing = await app.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces/reset',
    headers,
    payload: { locale: 'es' },
  });
  expect(missing.statusCode).toBe(401);
  const invalid = await app.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces',
    headers,
    payload: {},
  });
  expect(invalid.statusCode).toBe(400);
  const visitor = await newVisitor(app);
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: '/api/v1/demo/spaces/reset',
        payload: { locale: 'fr' },
      })
    ).statusCode,
  ).toBe(400);
  expect(await getTestDb().select().from(demoSpaces)).toHaveLength(1);
});
