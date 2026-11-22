import type {
  ApiErrorBody,
  DemoIdentity,
  ListView,
  Page,
  RequestDetail,
  RequestSummary,
  TourProgress,
} from '@flowdesk/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { demoSpaces, requestEvents, requests } from '../../src/db/schema.js';
import { buildApp } from '../../src/http/app.js';
import { newVisitor } from '../helpers/http.js';
import { getTestDb } from '../helpers/test-db.js';

const config = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
  LOG_LEVEL: 'silent',
});
const now = new Date('2026-11-22T15:00:00Z');
let app: FastifyInstance;
let a: Awaited<ReturnType<typeof newVisitor>>;
let b: Awaited<ReturnType<typeof newVisitor>>;
let target: RequestDetail;

beforeEach(async () => {
  await getTestDb().delete(demoSpaces);
  app = await buildApp({ config, db: getTestDb(), clock: () => now });
  a = await newVisitor(app);
  b = await newVisitor(app, 'en');
  const response = await a.inject({
    method: 'POST',
    url: '/api/v1/requests',
    payload: {
      softwareName: 'Private tool A',
      accessLevel: 'read',
      justification: 'Only visible in the first space.',
    },
  });
  expect(response.statusCode).toBe(201);
  target = response.json<RequestDetail>();
});
afterEach(async () => {
  await app?.close();
});

it.each<[DemoIdentity, string]>([
  ['employee', 'detail'],
  ['it_agent', 'detail'],
  ['approver', 'approve'],
  ['approver', 'reject'],
  ['it_agent', 'assign'],
  ['it_agent', 'release'],
  ['it_agent', 'complete'],
])(
  'B %s cannot use %s on A request and leaves data unchanged',
  async (identity, action) => {
    // Put A's request in a state visible/actionable by IT so a missing scope
    // filter cannot be masked by the policy hiding pending requests from IT.
    if (identity === 'it_agent') {
      await a.inject({
        method: 'PUT',
        url: '/api/v1/session/identity',
        payload: { identity: 'approver' },
      });
      expect(
        (
          await a.inject({
            method: 'POST',
            url: `/api/v1/requests/${target.id}/approve`,
          })
        ).statusCode,
      ).toBe(200);
      if (action === 'release' || action === 'complete') {
        await a.inject({
          method: 'PUT',
          url: '/api/v1/session/identity',
          payload: { identity: 'it_agent' },
        });
        expect(
          (
            await a.inject({
              method: 'POST',
              url: `/api/v1/requests/${target.id}/assign`,
            })
          ).statusCode,
        ).toBe(200);
      }
    }
    await b.inject({
      method: 'PUT',
      url: '/api/v1/session/identity',
      payload: { identity },
    });
    const db = getTestDb();
    const before = await db
      .select()
      .from(requests)
      .where(eq(requests.id, target.id));
    const events = await db
      .select()
      .from(requestEvents)
      .where(eq(requestEvents.requestId, target.id));
    const response = await b.inject({
      method: action === 'detail' ? 'GET' : 'POST',
      url: `/api/v1/requests/${target.id}${action === 'detail' ? '' : `/${action}`}`,
      payload:
        action === 'detail'
          ? undefined
          : { reason: 'Valid reason for the action.' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json<ApiErrorBody>().error.code).toBe('NOT_FOUND');
    expect(
      await db.select().from(requests).where(eq(requests.id, target.id)),
    ).toEqual(before);
    expect(
      await db
        .select()
        .from(requestEvents)
        .where(eq(requestEvents.requestId, target.id)),
    ).toEqual(events);
  },
);

it.each<[DemoIdentity, ListView[]]>([
  ['employee', ['mine']],
  ['approver', ['approvals_pending', 'approvals_decided']],
  ['it_agent', ['queue', 'assigned', 'completed']],
])('B lists never include A requests for %s', async (identity, views) => {
  await b.inject({
    method: 'PUT',
    url: '/api/v1/session/identity',
    payload: { identity },
  });
  const aRequests = await getTestDb()
    .select({ id: requests.id })
    .from(requests)
    .where(eq(requests.requesterId, target.requester.id));
  const aIds = new Set(aRequests.map((row) => row.id));
  for (const view of views) {
    const response = await b.inject({ url: `/api/v1/requests?view=${view}` });
    expect(response.statusCode).toBe(200);
    const page = response.json<Page<RequestSummary>>();
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.some((row) => aIds.has(row.id))).toBe(false);
  }
});

it('tour of B unaffected by A', async () => {
  const initial = (
    await b.inject({ url: '/api/v1/demo/tour' })
  ).json<TourProgress>();
  expect(initial).toEqual({
    created: false,
    decided: false,
    assigned: false,
    completed: false,
  });
  await a.inject({
    method: 'PUT',
    url: '/api/v1/session/identity',
    payload: { identity: 'approver' },
  });
  expect(
    (
      await a.inject({
        method: 'POST',
        url: `/api/v1/requests/${target.id}/approve`,
      })
    ).statusCode,
  ).toBe(200);
  await a.inject({
    method: 'PUT',
    url: '/api/v1/session/identity',
    payload: { identity: 'it_agent' },
  });
  expect(
    (
      await a.inject({
        method: 'POST',
        url: `/api/v1/requests/${target.id}/assign`,
      })
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await a.inject({
        method: 'POST',
        url: `/api/v1/requests/${target.id}/complete`,
      })
    ).statusCode,
  ).toBe(200);
  expect(
    (await a.inject({ url: '/api/v1/demo/tour' })).json<TourProgress>(),
  ).toEqual({ created: true, decided: true, assigned: true, completed: true });
  expect((await b.inject({ url: '/api/v1/demo/tour' })).json()).toEqual(
    initial,
  );
});
