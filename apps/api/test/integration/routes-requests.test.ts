import { randomUUID } from 'node:crypto';
import type {
  ApiErrorBody,
  DemoIdentity,
  Page,
  RequestDetail,
  RequestSummary,
  SessionInfo,
  TourProgress,
} from '@flowdesk/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import {
  demoSpaces,
  requestEvents,
  requests,
  sessions,
  userRoles,
  users,
} from '../../src/db/schema.js';
import { generateToken } from '../../src/demo/session/token.js';
import { buildApp } from '../../src/http/app.js';
import { newVisitor } from '../helpers/http.js';
import { getTestDb } from '../helpers/test-db.js';

const config = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
  LOG_LEVEL: 'silent',
});
const now = new Date('2026-11-23T02:30:00Z');
const input = {
  softwareName: 'Figma',
  accessLevel: 'edit',
  justification: 'I need to edit the team designs.',
  neededBy: '2026-11-22',
};
let app: FastifyInstance;
let visitor: Awaited<ReturnType<typeof newVisitor>>;

beforeEach(async () => {
  await getTestDb().delete(demoSpaces);
  app = await buildApp({ config, db: getTestDb(), clock: () => now });
  visitor = await newVisitor(app, 'en');
});
afterEach(async () => {
  await app?.close();
});

async function switchTo(identity: DemoIdentity) {
  const response = await visitor.inject({
    method: 'PUT',
    url: '/api/v1/session/identity',
    payload: { identity },
  });
  expect(response.statusCode).toBe(200);
  return response.json<SessionInfo>();
}

async function sample(code: string) {
  const [row] = await getTestDb()
    .select()
    .from(requests)
    .where(eq(requests.code, code));
  if (!row) throw new Error('Sample not found.');
  return row;
}

it('full tour through HTTP', async () => {
  // 1. Enter as employee. 2. Create. 3. Consult initial state.
  expect(
    (await visitor.inject({ url: '/api/v1/session' })).json<SessionInfo>()
      .activeIdentity,
  ).toBe('employee');
  const created = await visitor.inject({
    method: 'POST',
    url: '/api/v1/requests',
    payload: input,
  });
  expect(created.statusCode).toBe(201);
  const request = created.json<RequestDetail>();
  expect(request).toMatchObject({
    code: 'FD-0006',
    status: 'pending_approval',
    isSample: false,
    allowedActions: [],
  });
  expect(
    (
      await visitor.inject({ url: `/api/v1/requests/${request.id}` })
    ).json<RequestDetail>().status,
  ).toBe('pending_approval');
  // 4. Switch to approver. 5. Find and approve the pending request.
  await switchTo('approver');
  const pending = await visitor.inject({
    url: '/api/v1/requests?view=approvals_pending',
  });
  expect(
    pending.json<Page<RequestSummary>>().items.map((row) => row.id),
  ).toContain(request.id);
  const approved = await visitor.inject({
    method: 'POST',
    url: `/api/v1/requests/${request.id}/approve`,
    payload: { comment: 'Approved for the team.' },
  });
  expect(approved.statusCode).toBe(200);
  expect(approved.json<RequestDetail>().status).toBe('approved');
  // 6. Switch to IT. 7. Find and take the queued request. 8. Record manual completion.
  await switchTo('it_agent');
  const queue = await visitor.inject({ url: '/api/v1/requests?view=queue' });
  expect(
    queue.json<Page<RequestSummary>>().items.map((row) => row.id),
  ).toContain(request.id);
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: `/api/v1/requests/${request.id}/assign`,
      })
    ).statusCode,
  ).toBe(200);
  const completed = await visitor.inject({
    method: 'POST',
    url: `/api/v1/requests/${request.id}/complete`,
    payload: { note: 'Access granted manually.' },
  });
  expect(completed.statusCode).toBe(200);
  // 9. Return to employee, inspect final state and history.
  await switchTo('employee');
  const final = (
    await visitor.inject({ url: `/api/v1/requests/${request.id}` })
  ).json<RequestDetail>();
  expect(final.status).toBe('completed');
  expect(final.events.map((event) => event.type)).toEqual([
    'created',
    'approved',
    'assigned',
    'completed',
  ]);
  expect(final.completionNote).toBe('Access granted manually.');
  expect(
    (await visitor.inject({ url: '/api/v1/demo/tour' })).json<TourProgress>(),
  ).toEqual({ created: true, decided: true, assigned: true, completed: true });
});

it.each<[DemoIdentity, string, string, number]>([
  ['employee', 'approve', 'FD-0005', 403],
  ['employee', 'assign', 'FD-0004', 403],
  ['approver', 'assign', 'FD-0004', 403],
  ['approver', 'create', 'FD-0005', 403],
  ['it_agent', 'reject', 'FD-0005', 404],
  ['it_agent', 'complete', 'FD-0004', 403],
])(
  'permission matrix: %s %s on %s returns %s',
  async (identity, action, code, expected) => {
    const target = await sample(code);
    await switchTo(identity);
    const before = await getTestDb()
      .select()
      .from(requestEvents)
      .where(eq(requestEvents.requestId, target.id));
    const response = await visitor.inject({
      method: 'POST',
      url:
        action === 'create'
          ? '/api/v1/requests'
          : `/api/v1/requests/${target.id}/${action}`,
      payload:
        action === 'create'
          ? input
          : action === 'reject'
            ? { reason: 'This is not needed.' }
            : {},
    });
    expect(response.statusCode).toBe(expected);
    expect(response.json<ApiErrorBody>().error.code).toBe(
      expected === 404 ? 'NOT_FOUND' : 'FORBIDDEN',
    );
    expect(
      await getTestDb()
        .select()
        .from(requestEvents)
        .where(eq(requestEvents.requestId, target.id)),
    ).toEqual(before);
  },
);

it('reject without reason returns 400 with details.fields.reason', async () => {
  const target = await sample('FD-0005');
  await switchTo('approver');
  const response = await visitor.inject({
    method: 'POST',
    url: `/api/v1/requests/${target.id}/reject`,
  });
  expect(response.statusCode).toBe(400);
  expect(response.json<ApiErrorBody>().error.details).toEqual({
    fields: { reason: ['required'] },
  });
});

it('approve twice returns second 409 INVALID_TRANSITION', async () => {
  const target = await sample('FD-0005');
  await switchTo('approver');
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: `/api/v1/requests/${target.id}/approve`,
      })
    ).statusCode,
  ).toBe(200);
  const second = await visitor.inject({
    method: 'POST',
    url: `/api/v1/requests/${target.id}/approve`,
  });
  expect(second.statusCode).toBe(409);
  expect(second.json<ApiErrorBody>().error.code).toBe('INVALID_TRANSITION');
});

it('concurrent assign over HTTP: one 200, one 409', async () => {
  const db = getTestDb();
  const target = await sample('FD-0004');
  const employee = (
    await visitor.inject({ url: '/api/v1/session' })
  ).json<SessionInfo>();
  const agent = await switchTo('it_agent');
  // Use the factory's direct insert approach. Free the unused employee demo alias
  // for the second agent: aliases are unique per space and resolve requires one.
  await db
    .update(users)
    .set({ demoIdentity: null })
    .where(eq(users.id, employee.user.id));
  const id = randomUUID();
  await db.insert(users).values({
    id,
    demoSpaceId: target.demoSpaceId,
    displayName: 'Second Agent',
    jobTitle: 'IT agent',
    demoIdentity: 'employee',
  });
  await db
    .insert(userRoles)
    .values({ demoSpaceId: target.demoSpaceId, userId: id, role: 'it_agent' });
  const { token, hash } = generateToken();
  await db.insert(sessions).values({
    id: randomUUID(),
    demoSpaceId: target.demoSpaceId,
    tokenHash: hash,
    activeUserId: id,
    createdAt: now,
  });
  const results = await Promise.all([
    visitor.inject({
      method: 'POST',
      url: `/api/v1/requests/${target.id}/assign`,
    }),
    visitor.inject({
      method: 'POST',
      url: `/api/v1/requests/${target.id}/assign`,
      headers: { cookie: `fd_session=${token}` },
    }),
  ]);
  expect(results.map((response) => response.statusCode).sort()).toEqual([
    200, 409,
  ]);
  expect(
    results
      .find((response) => response.statusCode === 409)
      ?.json<ApiErrorBody>().error.code,
  ).toBe('INVALID_TRANSITION');
  const events = await db
    .select()
    .from(requestEvents)
    .where(
      and(
        eq(requestEvents.requestId, target.id),
        eq(requestEvents.type, 'assigned'),
      ),
    );
  expect(events).toHaveLength(1);
  expect([agent.user.id, id]).toContain(events[0]?.actorId);
});

it('quota returns 422 QUOTA_EXCEEDED with maxRequests=1', async () => {
  await app.close();
  app = await buildApp({
    config: { ...config, demo: { ...config.demo, maxRequests: 1 } },
    db: getTestDb(),
    clock: () => now,
  });
  visitor = await newVisitor(app);
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: '/api/v1/requests',
        payload: input,
      })
    ).statusCode,
  ).toBe(201);
  const response = await visitor.inject({
    method: 'POST',
    url: '/api/v1/requests',
    payload: input,
  });
  expect(response.statusCode).toBe(422);
  expect(response.json<ApiErrorBody>().error.code).toBe('QUOTA_EXCEEDED');
});

it('neededBy yesterday returns 400 date_in_past using Santiago date near midnight', async () => {
  const response = await visitor.inject({
    method: 'POST',
    url: '/api/v1/requests',
    payload: { ...input, neededBy: '2026-11-21' },
  });
  expect(response.statusCode).toBe(400);
  expect(response.json<ApiErrorBody>().error.details).toEqual({
    fields: { neededBy: ['date_in_past'] },
  });
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: '/api/v1/requests',
        payload: input,
      })
    ).statusCode,
  ).toBe(201);
});

it('stale identity uses the current employee and leaves FD-0005 pending', async () => {
  const target = await sample('FD-0005');
  await switchTo('approver');
  await switchTo('employee');
  const response = await visitor.inject({
    method: 'POST',
    url: `/api/v1/requests/${target.id}/approve`,
  });
  expect(response.statusCode).toBe(403);
  expect(
    (
      await visitor.inject({ url: `/api/v1/requests/${target.id}` })
    ).json<RequestDetail>().status,
  ).toBe('pending_approval');
});

it.each(['detail', 'approve', 'reject', 'assign', 'release', 'complete'])(
  'non-UUID on %s returns 404 NOT_FOUND',
  async (action) => {
    const response = await visitor.inject({
      method: action === 'detail' ? 'GET' : 'POST',
      url: `/api/v1/requests/not-a-uuid${action === 'detail' ? '' : `/${action}`}`,
      payload:
        action === 'detail'
          ? undefined
          : { reason: 'Valid reason for the action.' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json<ApiErrorBody>().error.code).toBe('NOT_FOUND');
  },
);

it.each([
  '!',
  '',
  Buffer.from('not-a-date|not-a-uuid').toString('base64url'),
  Buffer.from(`2026-11-22T00:00:00.000Z|not-a-uuid`).toString('base64url'),
  Buffer.from(`2026-02-30T00:00:00.000Z|${randomUUID()}`).toString('base64url'),
])(
  'invalid cursor %s returns 400 with details.fields.cursor',
  async (cursor) => {
    const response = await visitor.inject({
      url: `/api/v1/requests?view=mine&cursor=${encodeURIComponent(cursor)}`,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().error.code).toBe('VALIDATION_ERROR');
    expect(response.json<ApiErrorBody>().error.details).toHaveProperty(
      'fields.cursor',
    );
  },
);

it('valid cursor paginates with no duplicate rows and empty q means no filter', async () => {
  for (let i = 0; i < 16; i++)
    expect(
      (
        await visitor.inject({
          method: 'POST',
          url: '/api/v1/requests',
          payload: { ...input, softwareName: `Tool ${i}` },
        })
      ).statusCode,
    ).toBe(201);
  const first = (
    await visitor.inject({ url: '/api/v1/requests?view=mine&q=' })
  ).json<Page<RequestSummary>>();
  expect(first.items).toHaveLength(20);
  expect(first.nextCursor).not.toBeNull();
  const second = await visitor.inject({
    url: `/api/v1/requests?view=mine&cursor=${first.nextCursor}`,
  });
  expect(second.statusCode).toBe(200);
  const page = second.json<Page<RequestSummary>>();
  expect(page.items).toHaveLength(1);
  expect(page.nextCursor).toBeNull();
  expect(
    new Set([...first.items, ...page.items].map((row) => row.id)).size,
  ).toBe(21);
});

it('validates list query and action bodies with shared schemas', async () => {
  expect(
    (await visitor.inject({ url: '/api/v1/requests?view=unknown' })).statusCode,
  ).toBe(400);
  expect(
    (
      await visitor.inject({
        url: '/api/v1/requests?view=mine&q=' + 'a'.repeat(101),
      })
    ).statusCode,
  ).toBe(400);
  const target = await sample('FD-0005');
  await switchTo('approver');
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: `/api/v1/requests/${target.id}/approve`,
        payload: { comment: 'a'.repeat(501) },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: `/api/v1/requests/${target.id}/reject`,
        payload: { reason: 'Not needed for the team.' },
      })
    ).json<RequestDetail>().status,
  ).toBe('rejected');
  const approved = await sample('FD-0004');
  await switchTo('it_agent');
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: `/api/v1/requests/${approved.id}/assign`,
      })
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: `/api/v1/requests/${approved.id}/release`,
        payload: { reason: 'short' },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: `/api/v1/requests/${approved.id}/complete`,
        payload: { note: 'a'.repeat(501) },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await visitor.inject({
        method: 'POST',
        url: `/api/v1/requests/${approved.id}/release`,
        payload: { reason: 'Another agent will handle this.' },
      })
    ).json<RequestDetail>().status,
  ).toBe('approved');
});
