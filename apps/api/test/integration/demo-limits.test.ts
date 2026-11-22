import type { CreateRequestInput } from '@flowdesk/shared';
import { eq } from 'drizzle-orm';
import { beforeEach, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import type { Actor } from '../../src/core/actor.js';
import { DomainError } from '../../src/core/requests/errors.js';
import { RequestService } from '../../src/core/requests/service.js';
import { demoSpaces, requestEvents, requests } from '../../src/db/schema.js';
import { createDemoScopeHooks } from '../../src/demo/limits/scope-hooks.js';
import { SessionService } from '../../src/demo/session/session.service.js';
import { DemoSpaceService } from '../../src/demo/spaces/space.service.js';
import { getTestDb } from '../helpers/test-db.js';

const config = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
});
const now = new Date('2026-11-22T15:00:00.123Z');
const clock = () => now;
const input: CreateRequestInput = {
  softwareName: 'Demo Editor',
  accessLevel: 'edit',
  accessDetail: null,
  justification: 'I need to edit the shared campaign documents.',
  neededBy: null,
  comments: null,
};
let employee: Actor;
let service: RequestService;

beforeEach(async () => {
  const db = getTestDb();
  await db.delete(demoSpaces);
  const { token } = await new DemoSpaceService(db, config, clock).create('en');
  const result = await new SessionService(db, config, clock).resolve(token);
  if (result.status !== 'ok') throw new Error('Expected an active session.');
  employee = result.session.actor;
  service = new RequestService(db, createDemoScopeHooks(config));
});

it('codes continue from FD-0006 after samples', async () => {
  const request = await service.create(employee, input);
  expect(request.code).toBe('FD-0006');
  expect((await service.create(employee, input)).code).toBe('FD-0007');
  const [space] = await getTestDb()
    .select()
    .from(demoSpaces)
    .where(eq(demoSpaces.id, employee.scopeId));
  expect(space).toMatchObject({ requestSeq: 7, requestsCreated: 2 });
});

it('31st creation fails with QUOTA_EXCEEDED', async () => {
  for (let i = 0; i < 30; i++) await service.create(employee, input);
  await expect(service.create(employee, input)).rejects.toMatchObject({
    code: 'QUOTA_EXCEEDED',
  });
  const db = getTestDb();
  const [space] = await db
    .select()
    .from(demoSpaces)
    .where(eq(demoSpaces.id, employee.scopeId));
  expect(space).toMatchObject({ requestsCreated: 30, requestSeq: 35 });
  const rows = await db
    .select()
    .from(requests)
    .where(eq(requests.demoSpaceId, employee.scopeId));
  expect(rows).toHaveLength(35);
  expect(rows.filter((r) => !r.isSample)).toHaveLength(30);
  expect(
    (await db.select().from(requestEvents)).filter((e) => e.type === 'created'),
  ).toHaveLength(35);
});

it('concurrent creations never exceed quota', async () => {
  const limitedConfig = { ...config, demo: { ...config.demo, maxRequests: 3 } };
  const limited = new RequestService(
    getTestDb(),
    createDemoScopeHooks(limitedConfig),
  );
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => limited.create(employee, input)),
  );
  const successful = results.filter((result) => result.status === 'fulfilled');
  const failed = results.filter((result) => result.status === 'rejected');
  expect(successful).toHaveLength(3);
  expect(failed).toHaveLength(2);
  for (const failure of failed) {
    expect(failure.reason).toBeInstanceOf(DomainError);
    expect(failure.reason).toMatchObject({ code: 'QUOTA_EXCEEDED' });
  }
  const codes = successful.map((result) => result.value.code);
  expect(new Set(codes).size).toBe(3);
  expect(codes.sort()).toEqual(['FD-0006', 'FD-0007', 'FD-0008']);
  const [space] = await getTestDb()
    .select()
    .from(demoSpaces)
    .where(eq(demoSpaces.id, employee.scopeId));
  expect(space).toMatchObject({ requestSeq: 8, requestsCreated: 3 });
  expect(await getTestDb().select().from(requests)).toHaveLength(8);
});

it('rolls back the quota reservation and sequence when creation fails', async () => {
  const hooks = createDemoScopeHooks(config);
  const failing = new RequestService(getTestDb(), {
    reserveCreation: (tx, scopeId) => hooks.reserveCreation(tx, scopeId),
    allocateCode: async (tx, scopeId) => {
      await hooks.allocateCode(tx, scopeId);
      throw new Error('Creation interrupted.');
    },
  });
  await expect(failing.create(employee, input)).rejects.toThrow(
    'Creation interrupted.',
  );
  const [space] = await getTestDb()
    .select()
    .from(demoSpaces)
    .where(eq(demoSpaces.id, employee.scopeId));
  expect(space).toMatchObject({ requestsCreated: 0, requestSeq: 5 });
  expect((await service.create(employee, input)).code).toBe('FD-0006');
});

it('quota and sequence updates remain scoped to the visitor space', async () => {
  const db = getTestDb();
  const { token } = await new DemoSpaceService(db, config, clock).create('es');
  const other = await new SessionService(db, config, clock).resolve(token);
  if (other.status !== 'ok') throw new Error('Expected an active session.');
  await service.create(employee, input);
  const [space] = await db
    .select()
    .from(demoSpaces)
    .where(eq(demoSpaces.id, other.session.spaceId));
  expect(space).toMatchObject({ requestsCreated: 0, requestSeq: 5 });
  expect((await service.create(other.session.actor, input)).code).toBe(
    'FD-0006',
  );
});
