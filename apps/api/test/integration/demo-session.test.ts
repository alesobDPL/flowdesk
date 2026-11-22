import { DEMO_IDENTITIES, type Locale } from '@flowdesk/shared';
import { and, asc, eq } from 'drizzle-orm';
import { beforeEach, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import {
  approverAssignments,
  demoSpaces,
  requestEvents,
  requests,
  sessions,
  userRoles,
  users,
} from '../../src/db/schema.js';
import {
  SessionService,
  type ResolvedSession,
} from '../../src/demo/session/session.service.js';
import { hashToken } from '../../src/demo/session/token.js';
import {
  DemoCapacityError,
  DemoSpaceService,
} from '../../src/demo/spaces/space.service.js';
import { getTestDb } from '../helpers/test-db.js';

const start = new Date('2026-11-22T15:00:00.123Z');
const minute = 60_000;
const day = 24 * 60 * minute;
let now: Date;
const clock = () => now;
const config = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
});
let spaces: DemoSpaceService;
let service: SessionService;

beforeEach(async () => {
  const db = getTestDb();
  await db.delete(demoSpaces);
  now = new Date(start);
  spaces = new DemoSpaceService(db, config, clock);
  service = new SessionService(db, config, clock);
});

async function resolved(token: string): Promise<ResolvedSession> {
  const result = await service.resolve(token);
  if (result.status !== 'ok')
    throw new Error(`Unexpected session: ${result.status}`);
  return result.session;
}

it.each<Locale>(['es', 'en'])(
  'create seeds 3 users, 5 samples FD-0001..FD-0005 in the requested locale (%s)',
  async (locale) => {
    const db = getTestDb();
    const created = await spaces.create(locale);
    const session = await resolved(created.token);
    const [space] = await db.select().from(demoSpaces);
    expect(space).toMatchObject({
      id: session.spaceId,
      createdAt: start,
      lastSeenAt: start,
      hardExpiresAt: new Date(start.getTime() + 120 * minute),
      requestSeq: 5,
      requestsCreated: 0,
      status: 'active',
      endedAt: null,
    });
    expect(created.hardExpiresAt).toEqual(space?.hardExpiresAt);
    const people = await db.select().from(users);
    expect(people).toHaveLength(3);
    expect(new Set(people.map((p) => p.demoIdentity))).toEqual(
      new Set(DEMO_IDENTITIES),
    );
    const employee = people.find((p) => p.demoIdentity === 'employee')!;
    const approver = people.find((p) => p.demoIdentity === 'approver')!;
    const agent = people.find((p) => p.demoIdentity === 'it_agent')!;
    expect(await db.select().from(userRoles)).toEqual(
      expect.arrayContaining([
        {
          demoSpaceId: session.spaceId,
          userId: employee.id,
          role: 'requester',
        },
        { demoSpaceId: session.spaceId, userId: approver.id, role: 'approver' },
        { demoSpaceId: session.spaceId, userId: agent.id, role: 'it_agent' },
      ]),
    );
    expect(await db.select().from(userRoles)).toHaveLength(3);
    expect(await db.select().from(approverAssignments)).toEqual([
      {
        demoSpaceId: session.spaceId,
        requestTypeId: 1,
        approverId: approver.id,
      },
    ]);
    const samples = await db
      .select()
      .from(requests)
      .orderBy(asc(requests.code));
    expect(samples.map((r) => [r.code, r.softwareName, r.status])).toEqual([
      ['FD-0001', 'Salesforce', 'completed'],
      ['FD-0002', 'Adobe Acrobat Pro', 'rejected'],
      ['FD-0003', 'Jira', 'in_progress'],
      ['FD-0004', 'Tableau', 'approved'],
      ['FD-0005', 'Notion', 'pending_approval'],
    ]);
    expect(samples[0]?.justification).toMatch(
      locale === 'en' ? /customer/i : /clientes/i,
    );
    expect(employee).toMatchObject({
      displayName: 'Laura Méndez',
      jobTitle: 'Marketing',
    });
    expect(approver).toMatchObject({
      displayName: 'Diego Rojas',
      jobTitle: locale === 'en' ? 'Head of IT' : 'Jefe de TI',
    });
    expect(agent).toMatchObject({
      displayName: 'Ana Torres',
      jobTitle: locale === 'en' ? 'IT Support' : 'Soporte TI',
    });
    const expectedEvents = [
      ['created', 'approved', 'assigned', 'completed'],
      ['created', 'rejected'],
      ['created', 'approved', 'assigned'],
      ['created', 'approved'],
      ['created'],
    ];
    for (const [index, sample] of samples.entries()) {
      expect(sample).toMatchObject({
        demoSpaceId: session.spaceId,
        requesterId: employee.id,
        approverId: approver.id,
        requestTypeId: 1,
        isSample: true,
        assigneeId: sample.status === 'in_progress' ? agent.id : null,
        completedBy: sample.status === 'completed' ? agent.id : null,
      });
      const events = await db
        .select()
        .from(requestEvents)
        .where(eq(requestEvents.requestId, sample.id))
        .orderBy(asc(requestEvents.createdAt));
      expect(events.map((e) => e.type)).toEqual(expectedEvents[index]);
      let status: string | null = null;
      for (const event of events) {
        expect(event.demoSpaceId).toBe(session.spaceId);
        expect(event.fromStatus).toBe(status);
        expect(event.actorId).toBe(
          event.type === 'created'
            ? employee.id
            : event.type === 'approved' || event.type === 'rejected'
              ? approver.id
              : agent.id,
        );
        status = event.toStatus;
        expect(event.createdAt.getTime()).toBeGreaterThanOrEqual(
          start.getTime() - 10 * day,
        );
        expect(event.createdAt.getTime()).toBeLessThanOrEqual(
          start.getTime() - day,
        );
        expect(event.createdAt.getMilliseconds()).toBe(123);
      }
      expect(status).toBe(sample.status);
      expect(sample.createdAt).toEqual(events[0]?.createdAt);
      expect(sample.updatedAt).toEqual(events.at(-1)?.createdAt);
      expect(sample.decidedAt).toEqual(
        events.find((e) => e.type === 'approved' || e.type === 'rejected')
          ?.createdAt ?? null,
      );
      expect(sample.completedAt).toEqual(
        events.find((e) => e.type === 'completed')?.createdAt ?? null,
      );
      if (sample.status === 'rejected')
        expect(sample.decisionComment?.length).toBeGreaterThanOrEqual(10);
    }
    expect(await db.select().from(sessions)).toEqual([
      expect.objectContaining({
        demoSpaceId: session.spaceId,
        activeUserId: employee.id,
        createdAt: start,
      }),
    ]);
  },
);

it('resolve returns employee actor scoped to the space', async () => {
  const created = await spaces.create('es');
  const session = await resolved(created.token);
  const [employee] = await getTestDb()
    .select()
    .from(users)
    .where(eq(users.demoIdentity, 'employee'));
  expect(session.activeIdentity).toBe('employee');
  expect(session.actor).toEqual({
    userId: employee?.id,
    roles: ['requester'],
    scopeId: session.spaceId,
  });
  expect(session.hardExpiresAt).toEqual(created.hardExpiresAt);
  expect(session.lastSeenAt).toEqual(start);
});

it('missing token or unknown hash returns missing', async () => {
  expect(await service.resolve(undefined)).toEqual({ status: 'missing' });
  expect(await service.resolve('unknown')).toEqual({ status: 'missing' });
});

it('the stored value is the hash, not the token', async () => {
  const { token } = await spaces.create('en');
  const rows = await getTestDb().select().from(sessions);
  expect(rows).toHaveLength(1);
  expect(rows[0]?.tokenHash).toEqual(hashToken(token));
  expect(JSON.stringify(rows)).not.toContain(token);
});

it('switchIdentity changes active user within the space', async () => {
  const first = await spaces.create('en');
  const otherToken = (await spaces.create('es')).token;
  const other = await resolved(otherToken);
  const session = await resolved(first.token);
  const info = await service.switchIdentity(session, 'approver');
  expect(info.activeIdentity).toBe('approver');
  expect(info.roles).toEqual(['approver']);
  expect(info.identities.map((i) => i.identity)).toEqual(DEMO_IDENTITIES);
  const current = await resolved(first.token);
  expect(current.actor).toEqual({
    userId: info.user.id,
    roles: ['approver'],
    scopeId: session.spaceId,
  });
  expect((await resolved(otherToken)).activeIdentity).toBe('employee');
  expect(current.actor.userId).not.toBe(other.actor.userId);
  const agent = await service.switchIdentity(current, 'it_agent');
  expect(agent.roles).toEqual(['it_agent']);
  expect((await service.switchIdentity(current, 'employee')).roles).toEqual([
    'requester',
  ]);
});

it('does not switch to an identity from another space', async () => {
  const first = await resolved((await spaces.create('en')).token);
  await spaces.create('es');
  await getTestDb()
    .update(users)
    .set({ demoIdentity: null })
    .where(
      and(
        eq(users.demoSpaceId, first.spaceId),
        eq(users.demoIdentity, 'approver'),
      ),
    );
  await expect(service.switchIdentity(first, 'approver')).rejects.toThrow();
  expect(
    (
      await getTestDb()
        .select()
        .from(sessions)
        .where(eq(sessions.id, first.sessionId))
    )[0]?.activeUserId,
  ).toBe(first.actor.userId);
});

it('expired by hard TTL', async () => {
  const { token } = await spaces.create('es');
  now = new Date(start.getTime() + 121 * minute);
  // Keep activity recent to isolate the hard limit.
  await getTestDb().update(demoSpaces).set({ lastSeenAt: now });
  expect(await service.resolve(token)).toEqual({ status: 'expired' });
});

it('expired by inactivity', async () => {
  const { token } = await spaces.create('es');
  await getTestDb()
    .update(demoSpaces)
    .set({ lastSeenAt: new Date(start.getTime() - 31 * minute) });
  expect(await service.resolve(token)).toEqual({ status: 'expired' });
});

it.each(['hard', 'idle'] as const)(
  'expires exactly at the %s boundary',
  async (limit) => {
    const { token } = await spaces.create('es');
    now = new Date(start.getTime() + (limit === 'hard' ? 120 : 30) * minute);
    if (limit === 'hard')
      await getTestDb().update(demoSpaces).set({ lastSeenAt: now });
    expect(await service.resolve(token)).toEqual({ status: 'expired' });
  },
);

it('touch within the idle window prolongs it', async () => {
  const { token } = await spaces.create('es');
  now = new Date(start.getTime() + 29 * minute);
  const session = await resolved(token);
  await service.touch(session);
  expect((await service.info(session)).expiresAt).toBe(
    new Date(now.getTime() + 30 * minute).toISOString(),
  );
  now = new Date(start.getTime() + 31 * minute);
  expect((await service.resolve(token)).status).toBe('ok');
});

it('touch writes at most once per minute', async () => {
  const { token } = await spaces.create('es');
  const session = await resolved(token);
  now = new Date(start.getTime() + minute);
  await service.touch(session);
  expect((await resolved(token)).lastSeenAt).toEqual(start);
  now = new Date(start.getTime() + minute + 1);
  await service.touch(session);
  const firstWrite = now;
  now = new Date(now.getTime() + 1000);
  await service.touch(session);
  expect((await resolved(token)).lastSeenAt).toEqual(firstWrite);
});

it('info.expiresAt is the earlier limit', async () => {
  const { token } = await spaces.create('en');
  expect((await service.info(await resolved(token))).expiresAt).toBe(
    new Date(start.getTime() + 30 * minute).toISOString(),
  );
  now = new Date(start.getTime() + 110 * minute);
  await getTestDb().update(demoSpaces).set({ lastSeenAt: now });
  expect((await service.info(await resolved(token))).expiresAt).toBe(
    new Date(start.getTime() + 120 * minute).toISOString(),
  );
});

it('reset ends old space and creates a new one', async () => {
  const { token } = await spaces.create('es');
  const old = await resolved(token);
  now = new Date(start.getTime() + 5 * minute);
  const created = await spaces.reset(old, 'en');
  expect(created.token).not.toBe(token);
  expect(await service.resolve(token)).toEqual({ status: 'expired' });
  const current = await resolved(created.token);
  expect(current.spaceId).not.toBe(old.spaceId);
  expect(current.activeIdentity).toBe('employee');
  expect(current.hardExpiresAt).toEqual(new Date(now.getTime() + 120 * minute));
  expect(
    (
      await getTestDb()
        .select()
        .from(demoSpaces)
        .where(eq(demoSpaces.id, old.spaceId))
    )[0],
  ).toMatchObject({ status: 'ended', endedAt: now });
  expect(
    await getTestDb()
      .select()
      .from(requests)
      .where(eq(requests.demoSpaceId, current.spaceId)),
  ).toHaveLength(5);
});

it('capacity counts active, non-expired spaces only', async () => {
  const db = getTestDb();
  const limited = new DemoSpaceService(
    db,
    { ...config, demo: { ...config.demo, maxActiveSpaces: 2 } },
    clock,
  );
  const first = await resolved((await limited.create('es')).token);
  await limited.create('en');
  await expect(limited.create('es')).rejects.toBeInstanceOf(DemoCapacityError);
  expect(await db.select().from(demoSpaces)).toHaveLength(2);
  const replacement = await limited.reset(first, 'en');
  expect((await service.resolve(replacement.token)).status).toBe('ok');
  await expect(limited.create('es')).rejects.toBeInstanceOf(DemoCapacityError);
  now = new Date(start.getTime() + 30 * minute);
  await limited.create('es'); // Idle spaces no longer count, including at equality.
  await db.update(demoSpaces).set({ lastSeenAt: now, hardExpiresAt: now });
  await limited.create('en'); // Hard-expired spaces do not count either.
});

it('concurrent creates respect capacity and roll back rejected creations', async () => {
  const db = getTestDb();
  const limited = new DemoSpaceService(
    db,
    { ...config, demo: { ...config.demo, maxActiveSpaces: 1 } },
    clock,
  );
  const results = await Promise.allSettled([
    limited.create('es'),
    limited.create('en'),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.find((r) => r.status === 'rejected')?.reason).toBeInstanceOf(
    DemoCapacityError,
  );
  expect(await db.select().from(demoSpaces)).toHaveLength(1);
  expect(await db.select().from(users)).toHaveLength(3);
  expect(await db.select().from(requests)).toHaveLength(5);
  expect(await db.select().from(sessions)).toHaveLength(1);
});

it('a missing session after cleanup returns missing', async () => {
  const { token } = await spaces.create('es');
  await getTestDb().delete(demoSpaces);
  expect(await service.resolve(token)).toEqual({ status: 'missing' });
});
