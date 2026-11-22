import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { afterEach, expect, it } from 'vitest';
import type { Db } from '../../src/db/client.js';
import { insertSpace } from '../helpers/factories.js';
import { getTestDb } from '../helpers/test-db.js';

type Space = Awaited<ReturnType<typeof insertSpace>>;

function insertRequest(
  db: Db,
  space: Space,
  opts: {
    requesterId?: string;
    status?: 'approved' | 'in_progress';
    assigneeId?: string | null;
    code?: string;
  } = {},
) {
  const id = randomUUID();
  return db.execute(sql`
    INSERT INTO requests (
      id, demo_space_id, code, request_type_id, requester_id, approver_id,
      software_name, access_level, justification, status, assignee_id,
      is_sample, version, created_at, updated_at
    ) VALUES (
      ${id}, ${space.spaceId}, ${opts.code ?? 'FD-0001'}, 1,
      ${opts.requesterId ?? space.employeeId}, ${space.approverId},
      'Figma', 'edit', 'Necesito editar diseños', ${opts.status ?? 'approved'},
      ${opts.assigneeId ?? null}, false, 0, now(), now()
    ) RETURNING id
  `);
}

afterEach(async () => {
  await getTestDb().execute(sql`DELETE FROM demo_spaces`);
});

it('deleting a space cascades to every table', async () => {
  const db = getTestDb();
  const space = await insertSpace(db);
  const other = await insertSpace(db);
  const request = await insertRequest(db, space);
  const requestId = request.rows[0]?.id;
  expect(requestId).toBeDefined();
  await db.execute(sql`
    INSERT INTO request_events (
      demo_space_id, request_id, type, actor_id, from_status, to_status, created_at
    ) VALUES (
      ${space.spaceId}, ${requestId}, 'created', ${space.employeeId},
      NULL, 'pending_approval', now()
    )
  `);
  await db.execute(sql`
    INSERT INTO sessions (id, token_hash, demo_space_id, active_user_id, created_at)
    VALUES (
      ${randomUUID()}, ${Buffer.alloc(32, 1)}, ${space.spaceId},
      ${space.employeeId}, now()
    )
  `);

  const scopedTables = [
    'users',
    'user_roles',
    'approver_assignments',
    'requests',
    'request_events',
    'sessions',
  ];
  for (const table of scopedTables) {
    const before = await db.execute(sql`
      SELECT count(*)::int AS count FROM ${sql.identifier(table)}
      WHERE demo_space_id = ${space.spaceId}
    `);
    expect(before.rows[0]?.count, table).toBeGreaterThan(0);
  }

  await db.execute(sql`DELETE FROM demo_spaces WHERE id = ${space.spaceId}`);

  for (const table of scopedTables) {
    const after = await db.execute(sql`
      SELECT count(*)::int AS count FROM ${sql.identifier(table)}
      WHERE demo_space_id = ${space.spaceId}
    `);
    expect(after.rows[0]?.count, table).toBe(0);
  }
  const survivors = await db.execute(sql`
    SELECT count(*)::int AS count FROM users WHERE demo_space_id = ${other.spaceId}
  `);
  expect(survivors.rows[0]?.count).toBe(3);
  const types = await db.execute(sql`SELECT id, key, name FROM request_types`);
  expect(types.rows).toEqual([
    { id: 1, key: 'software_access', name: 'Software access' },
  ]);
});

it('rejects a request whose requester belongs to another space', async () => {
  const db = getTestDb();
  const space = await insertSpace(db);
  const other = await insertSpace(db);
  await expect(
    insertRequest(db, space, { requesterId: other.employeeId }),
  ).rejects.toMatchObject({ cause: { code: '23503' } });
});

it('rejects in_progress without assignee and approved with assignee', async () => {
  const db = getTestDb();
  const space = await insertSpace(db);
  await expect(
    insertRequest(db, space, { status: 'in_progress' }),
  ).rejects.toMatchObject({ cause: { code: '23514' } });
  await expect(
    insertRequest(db, space, { status: 'approved', assigneeId: space.agentId }),
  ).rejects.toMatchObject({ cause: { code: '23514' } });
});

it('code is unique per space, not globally', async () => {
  const db = getTestDb();
  const space = await insertSpace(db);
  const other = await insertSpace(db);
  await insertRequest(db, space);
  await insertRequest(db, other);
  await expect(insertRequest(db, space)).rejects.toMatchObject({
    cause: { code: '23505' },
  });
  const counts = await db.execute(sql`
    SELECT demo_space_id, count(*)::int AS count FROM requests
    GROUP BY demo_space_id ORDER BY demo_space_id
  `);
  expect(counts.rows).toHaveLength(2);
  expect(counts.rows.map((row) => row.count)).toEqual([1, 1]);
});
