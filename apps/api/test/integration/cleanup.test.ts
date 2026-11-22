import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, expect, inject, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { createDb } from '../../src/db/client.js';
import {
  demoSpaces,
  requestEvents,
  requests,
  sessions,
  users,
} from '../../src/db/schema.js';
import { runCleanup } from '../../src/demo/cleanup/cleanup.js';
import { DemoSpaceService } from '../../src/demo/spaces/space.service.js';
import { getTestDb } from '../helpers/test-db.js';

const now = new Date('2026-11-22T15:00:00.123Z');
const minute = 60_000;
const config = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
});
const ago = (minutes: number) => new Date(now.getTime() - minutes * minute);

async function insertSpace(
  overrides: Partial<typeof demoSpaces.$inferInsert> = {},
) {
  const id = randomUUID();
  await getTestDb()
    .insert(demoSpaces)
    .values({
      id,
      createdAt: ago(120),
      hardExpiresAt: new Date(now.getTime() + 60 * minute),
      lastSeenAt: now,
      status: 'active',
      endedAt: null,
      requestSeq: 0,
      requestsCreated: 0,
      ...overrides,
    });
  return id;
}

beforeEach(async () => {
  await getTestDb().delete(demoSpaces);
});
afterEach(async () => {
  await getTestDb().delete(demoSpaces);
});

it('deletes spaces past hard TTL + grace', async () => {
  await insertSpace({ hardExpiresAt: ago(16) });
  expect(await runCleanup(getTestDb(), config, now)).toEqual({
    deletedSpaces: 1,
    skipped: false,
  });
  expect(await getTestDb().select().from(demoSpaces)).toHaveLength(0);
});

it('deletes idle spaces after idle + grace', async () => {
  await insertSpace({ lastSeenAt: ago(46) });
  expect(await runCleanup(getTestDb(), config, now)).toEqual({
    deletedSpaces: 1,
    skipped: false,
  });
  expect(await getTestDb().select().from(demoSpaces)).toHaveLength(0);
});

it('deletes ended spaces after grace', async () => {
  await insertSpace({ status: 'ended', endedAt: ago(16) });
  expect(await runCleanup(getTestDb(), config, now)).toEqual({
    deletedSpaces: 1,
    skipped: false,
  });
  expect(await getTestDb().select().from(demoSpaces)).toHaveLength(0);
});

it('keeps active and recently-expired spaces', async () => {
  const ids = await Promise.all([
    insertSpace(),
    insertSpace({ hardExpiresAt: ago(10) }),
    insertSpace({ lastSeenAt: ago(40) }),
    insertSpace({ status: 'ended', endedAt: ago(10) }),
    insertSpace({ hardExpiresAt: ago(15) }),
    insertSpace({ lastSeenAt: ago(45) }),
    insertSpace({ status: 'ended', endedAt: ago(15) }),
    insertSpace({ endedAt: ago(20) }), // ended_at alone must not end an active space.
  ]);
  expect(await runCleanup(getTestDb(), config, now)).toEqual({
    deletedSpaces: 0,
    skipped: false,
  });
  expect(
    (await getTestDb().select().from(demoSpaces)).map((s) => s.id).sort(),
  ).toEqual(ids.sort());
});

it('second concurrent run is skipped', async () => {
  await insertSpace({ hardExpiresAt: ago(20) });
  const blocker = createDb(inject('databaseUrl'));
  try {
    // A separate pool guarantees the lock is held by another connection.
    await blocker.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1178882897)`);
      expect(await runCleanup(getTestDb(), config, now)).toEqual({
        deletedSpaces: 0,
        skipped: true,
      });
      expect(await getTestDb().select().from(demoSpaces)).toHaveLength(1);
    });
    expect(await runCleanup(getTestDb(), config, now)).toEqual({
      deletedSpaces: 1,
      skipped: false,
    });
  } finally {
    await blocker.pool.end();
  }
});

it('deletes all batches and uses the configured thresholds', async () => {
  const custom = {
    ...config,
    demo: { ...config.demo, idleMin: 10, cleanupGraceMin: 5, cleanupBatch: 2 },
  };
  for (let i = 0; i < 5; i++) await insertSpace({ lastSeenAt: ago(16) });
  await insertSpace({ hardExpiresAt: ago(6) });
  await insertSpace({ status: 'ended', endedAt: ago(6) });
  const survivor = await insertSpace({
    lastSeenAt: ago(15),
    hardExpiresAt: ago(5),
  });
  expect(await runCleanup(getTestDb(), custom, now)).toEqual({
    deletedSpaces: 7,
    skipped: false,
  });
  expect(
    (await getTestDb().select().from(demoSpaces)).map((s) => s.id),
  ).toEqual([survivor]);
});

it('cleanup cascades through a complete demo space', async () => {
  const db = getTestDb();
  await new DemoSpaceService(db, config, () => now).create('en');
  expect(await db.select().from(users)).toHaveLength(3);
  expect(await db.select().from(requests)).toHaveLength(5);
  expect(await db.select().from(requestEvents)).toHaveLength(12);
  expect(await db.select().from(sessions)).toHaveLength(1);
  await db
    .update(demoSpaces)
    .set({ hardExpiresAt: ago(16) })
    .where(eq(demoSpaces.status, 'active'));
  expect(await runCleanup(db, config, now)).toEqual({
    deletedSpaces: 1,
    skipped: false,
  });
  expect(await db.select().from(users)).toHaveLength(0);
  expect(await db.select().from(requests)).toHaveLength(0);
  expect(await db.select().from(requestEvents)).toHaveLength(0);
  expect(await db.select().from(sessions)).toHaveLength(0);
});
