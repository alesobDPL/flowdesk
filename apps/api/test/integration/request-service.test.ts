import { randomUUID } from 'node:crypto';
import type { CreateRequestInput } from '@flowdesk/shared';
import { eq, sql } from 'drizzle-orm';
import { afterEach, beforeEach, expect, it } from 'vitest';
import type { Actor } from '../../src/core/actor.js';
import { DomainError } from '../../src/core/requests/errors.js';
import {
  RequestService,
  type ScopeHooks,
} from '../../src/core/requests/service.js';
import type { Db } from '../../src/db/client.js';
import {
  approverAssignments,
  demoSpaces,
  requestEvents,
  requests,
  userRoles,
  users,
} from '../../src/db/schema.js';
import { insertSpace } from '../helpers/factories.js';
import { getTestDb } from '../helpers/test-db.js';

type Space = Awaited<ReturnType<typeof insertSpace>>;

const input: CreateRequestInput = {
  softwareName: 'Figma',
  accessLevel: 'edit',
  accessDetail: null,
  justification: 'Necesito editar los diseños del equipo',
  neededBy: '2026-12-01',
  comments: 'Para el equipo de marketing',
};

let db: Db;
let space: Space;
let employee: Actor;
let approver: Actor;
let agent: Actor;
let hooks: ScopeHooks;
let service: RequestService;

beforeEach(async () => {
  db = getTestDb();
  space = await insertSpace(db);
  employee = {
    userId: space.employeeId,
    roles: ['requester'],
    scopeId: space.spaceId,
  };
  approver = {
    userId: space.approverId,
    roles: ['approver'],
    scopeId: space.spaceId,
  };
  agent = {
    userId: space.agentId,
    roles: ['it_agent'],
    scopeId: space.spaceId,
  };
  const sequences = new Map<string, number>();
  hooks = {
    reserveCreation: () => Promise.resolve(),
    allocateCode: (_tx, scopeId) => {
      const sequence = (sequences.get(scopeId) ?? 5) + 1;
      sequences.set(scopeId, sequence);
      return Promise.resolve(`FD-${String(sequence).padStart(4, '0')}`);
    },
  };
  service = new RequestService(db, hooks);
});

afterEach(async () => {
  await db.delete(demoSpaces);
});

it('creates a request with code and created event', async () => {
  const calls: string[] = [];
  service = new RequestService(db, {
    reserveCreation: (_tx, scopeId) => {
      expect(scopeId).toBe(space.spaceId);
      calls.push('reserve');
      return Promise.resolve();
    },
    allocateCode: (tx, scopeId) => {
      calls.push('allocate');
      return hooks.allocateCode(tx, scopeId);
    },
  });
  const request = await service.create(employee, input);
  expect(calls).toEqual(['reserve', 'allocate']);
  expect(request).toMatchObject({
    ...input,
    code: 'FD-0006',
    status: 'pending_approval',
    requester: { id: employee.userId },
    approver: { id: approver.userId },
    assignee: null,
    completedBy: null,
    isSample: false,
    allowedActions: [],
  });
  expect(request.events).toHaveLength(1);
  expect(request.events[0]).toMatchObject({
    type: 'created',
    actor: { id: employee.userId },
    fromStatus: null,
    toStatus: 'pending_approval',
    note: null,
  });
  expect(new Date(request.createdAt).toISOString()).toBe(request.createdAt);
  expect(request.events[0]?.createdAt).toBe(request.createdAt);
  expect((await service.get(approver, request.id)).allowedActions).toEqual([
    'approve',
    'reject',
  ]);
});

it('blocks creation without configured approver', async () => {
  await db
    .delete(approverAssignments)
    .where(eq(approverAssignments.demoSpaceId, space.spaceId));
  // An assignment in another scope must not satisfy the lookup.
  await insertSpace(db);
  await expect(service.create(employee, input)).rejects.toMatchObject({
    code: 'APPROVER_NOT_CONFIGURED',
  });
  expect(await db.select().from(requests)).toHaveLength(0);
});

it('blocks creation when approver is requester', async () => {
  await db.insert(userRoles).values({
    demoSpaceId: space.spaceId,
    userId: employee.userId,
    role: 'approver',
  });
  await db
    .update(approverAssignments)
    .set({ approverId: employee.userId })
    .where(eq(approverAssignments.demoSpaceId, space.spaceId));
  await expect(
    service.create({ ...employee, roles: ['requester', 'approver'] }, input),
  ).rejects.toMatchObject({ code: 'SELF_APPROVAL_CONFLICT' });
  expect(await db.select().from(requests)).toHaveLength(0);
});

it('checks creation permission before approver configuration and hooks', async () => {
  await db
    .delete(approverAssignments)
    .where(eq(approverAssignments.demoSpaceId, space.spaceId));
  const unexpectedHook = () => {
    throw new Error('Creation hook must not be called');
  };
  service = new RequestService(db, {
    reserveCreation: unexpectedHook,
    allocateCode: unexpectedHook,
  });
  await expect(service.create(agent, input)).rejects.toMatchObject({
    code: 'FORBIDDEN',
  });
});

it('full happy path', async () => {
  const request = await service.create(employee, input);
  await service.approve(approver, request.id, { comment: 'Budget approved' });
  await service.assign(agent, request.id);
  const result = await service.complete(agent, request.id, {
    note: 'Access granted',
  });
  expect(result).toMatchObject({
    status: 'completed',
    decisionComment: 'Budget approved',
    completionNote: 'Access granted',
    assignee: null,
    completedBy: { id: agent.userId },
    allowedActions: [],
  });
  expect(result.decidedAt).not.toBeNull();
  expect(result.completedAt).not.toBeNull();
  expect(
    result.events.map((event) => [
      event.type,
      event.actor.id,
      event.fromStatus,
      event.toStatus,
      event.note,
    ]),
  ).toEqual([
    ['created', employee.userId, null, 'pending_approval', null],
    [
      'approved',
      approver.userId,
      'pending_approval',
      'approved',
      'Budget approved',
    ],
    ['assigned', agent.userId, 'approved', 'in_progress', null],
    ['completed', agent.userId, 'in_progress', 'completed', 'Access granted'],
  ]);
  expect(result.events.map((event) => event.createdAt)).toEqual(
    result.events.map((event) => event.createdAt).toSorted(),
  );
  expect(await service.get(employee, request.id)).toEqual(result);
  const [stored] = await db
    .select()
    .from(requests)
    .where(eq(requests.id, request.id));
  expect(stored?.version).toBe(3);
});

it('release returns to queue and keeps approval', async () => {
  const request = await service.create(employee, input);
  const decision = await service.approve(approver, request.id, {
    comment: 'Approved for team',
  });
  await service.assign(agent, request.id);
  const result = await service.release(agent, request.id, {
    reason: 'Another technician will handle this',
  });
  expect(result).toMatchObject({
    status: 'approved',
    assignee: null,
    decidedAt: decision.decidedAt,
    decisionComment: decision.decisionComment,
    allowedActions: ['assign'],
  });
  expect(result.events.at(-1)).toMatchObject({
    type: 'released',
    actor: { id: agent.userId },
    fromStatus: 'in_progress',
    toStatus: 'approved',
    note: 'Another technician will handle this',
  });
  expect(
    (await service.list(agent, { view: 'queue' })).items.map((item) => item.id),
  ).toEqual([request.id]);
});

it('concurrent assign: exactly one wins', async () => {
  const secondAgent: Actor = { ...agent, userId: randomUUID() };
  await db.insert(users).values({
    id: secondAgent.userId,
    demoSpaceId: space.spaceId,
    displayName: 'Second Agent',
    jobTitle: 'IT agent',
    demoIdentity: null,
  });
  await db.insert(userRoles).values({
    demoSpaceId: space.spaceId,
    userId: secondAgent.userId,
    role: 'it_agent',
  });
  const request = await service.create(employee, input);
  await service.approve(approver, request.id, { comment: null });
  const results = await Promise.allSettled([
    service.assign(agent, request.id),
    service.assign(secondAgent, request.id),
  ]);
  const successes = results.filter((result) => result.status === 'fulfilled');
  const failures = results.filter((result) => result.status === 'rejected');
  expect(successes).toHaveLength(1);
  expect(failures).toHaveLength(1);
  expect(failures[0]?.reason).toBeInstanceOf(DomainError);
  expect(failures[0]?.reason).toMatchObject({ code: 'INVALID_TRANSITION' });
  const result = await service.get(agent, request.id);
  const assigned = result.events.filter((event) => event.type === 'assigned');
  expect(assigned).toHaveLength(1);
  expect(result.status).toBe('in_progress');
  expect(result.assignee?.id).toBe(successes[0]?.value.assignee?.id);
  expect(assigned[0]?.actor.id).toBe(result.assignee?.id);
});

it('isolation: actor of space B gets NOT_FOUND on space A request', async () => {
  const request = await service.create(employee, input);
  const other = await insertSpace(db);
  const otherEmployee: Actor = {
    ...employee,
    userId: other.employeeId,
    scopeId: other.spaceId,
  };
  const otherApprover: Actor = {
    ...approver,
    userId: other.approverId,
    scopeId: other.spaceId,
  };
  await expect(service.get(otherEmployee, request.id)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  });
  await expect(
    service.approve(otherApprover, request.id, { comment: null }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  const otherRequest = await service.create(otherEmployee, input);
  expect(otherRequest.code).toBe(request.code);
  expect(
    (await service.list(otherEmployee, { view: 'mine' })).items.map(
      (item) => item.id,
    ),
  ).toEqual([otherRequest.id]);
  expect(await service.get(employee, request.id)).toEqual(request);
});

it('list views and filters', async () => {
  const pending = await service.create(employee, input);
  const queued = await service.create(employee, input);
  const assigned = await service.create(employee, input);
  const completed = await service.create(employee, input);
  const rejected = await service.create(employee, input);
  for (const request of [queued, assigned, completed]) {
    await service.approve(approver, request.id, { comment: null });
  }
  await service.assign(agent, assigned.id);
  await service.assign(agent, completed.id);
  await service.complete(agent, completed.id, { note: null });
  await service.reject(approver, rejected.id, {
    reason: 'No budget available for this tool',
  });
  const mine = await service.list(employee, { view: 'mine' });
  expect(mine.items).toHaveLength(5);
  expect(
    (await service.list(approver, { view: 'approvals_pending' })).items.map(
      (item) => item.id,
    ),
  ).toEqual([pending.id]);
  expect(
    (await service.list(approver, { view: 'approvals_decided' })).items
      .map((item) => item.id)
      .toSorted(),
  ).toEqual([queued.id, assigned.id, completed.id, rejected.id].toSorted());
  expect(
    (await service.list(agent, { view: 'queue' })).items.map((item) => item.id),
  ).toEqual([queued.id]);
  expect(
    (await service.list(agent, { view: 'assigned' })).items.map(
      (item) => item.id,
    ),
  ).toEqual([assigned.id]);
  expect(
    (await service.list(agent, { view: 'completed' })).items.map(
      (item) => item.id,
    ),
  ).toEqual([completed.id]);
  expect(
    (
      await service.list(employee, { view: 'mine', status: 'completed' })
    ).items.map((item) => item.id),
  ).toEqual([completed.id]);
  expect(
    (await service.list(agent, { view: 'queue', status: 'completed' })).items,
  ).toEqual([]);
  await expect(service.list(employee, { view: 'queue' })).rejects.toMatchObject(
    { code: 'FORBIDDEN' },
  );
  await expect(
    service.list(agent, { view: 'approvals_pending' }),
  ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(service.list(approver, { view: 'mine' })).rejects.toMatchObject({
    code: 'FORBIDDEN',
  });
});

it('search treats % and _ literally', async () => {
  const percent = await service.create(employee, {
    ...input,
    softwareName: '100% Tool',
  });
  const plain = await service.create(employee, {
    ...input,
    softwareName: 'Tool',
  });
  expect(
    (await service.list(employee, { view: 'mine', q: '%' })).items.map(
      (item) => item.id,
    ),
  ).toEqual([percent.id]);
  expect(
    (await service.list(employee, { view: 'mine', q: '_' })).items,
  ).toEqual([]);
  const underscore = await service.create(employee, {
    ...input,
    softwareName: 'Team_Tool',
  });
  const backslash = await service.create(employee, {
    ...input,
    softwareName: 'Team\\Tool',
  });
  expect(
    (await service.list(employee, { view: 'mine', q: '_' })).items.map(
      (item) => item.id,
    ),
  ).toEqual([underscore.id]);
  expect(
    (await service.list(employee, { view: 'mine', q: '\\' })).items.map(
      (item) => item.id,
    ),
  ).toEqual([backslash.id]);
  expect(
    (
      await service.list(employee, {
        view: 'mine',
        q: plain.code.toLowerCase(),
      })
    ).items.map((item) => item.id),
  ).toEqual([plain.id]);
  expect(
    (await service.list(employee, { view: 'mine', q: ' 100% ' })).items.map(
      (item) => item.id,
    ),
  ).toEqual([percent.id]);
  expect(
    (await service.list(employee, { view: 'mine', q: '   ' })).items,
  ).toHaveLength(4);
});

it('cursor pagination', async () => {
  for (let index = 0; index < 25; index++) {
    await service.create(employee, input);
  }
  // Equal timestamps force the cursor to use the UUID tie-breaker.
  const createdAt = new Date('2026-11-22T12:00:00.000Z');
  await db
    .update(requests)
    .set({ createdAt })
    .where(eq(requests.demoSpaceId, space.spaceId));
  const first = await service.list(employee, { view: 'mine' });
  expect(first.items).toHaveLength(20);
  expect(first.nextCursor).not.toBeNull();
  const last = first.items.at(-1);
  expect(
    Buffer.from(first.nextCursor ?? '', 'base64url').toString('utf8'),
  ).toBe(`${last?.createdAt}|${last?.id}`);
  const second = await service.list(employee, {
    view: 'mine',
    cursor: first.nextCursor ?? '',
  });
  expect(second.items).toHaveLength(5);
  expect(second.nextCursor).toBeNull();
  const ids = [...first.items, ...second.items].map((item) => item.id);
  expect(new Set(ids).size).toBe(25);
  expect(ids).toEqual(ids.toSorted().reverse());
});

it('reject stores the reason in the decision and event without duplicate transitions', async () => {
  const request = await service.create(employee, input);
  const reason = 'This software is outside the approved budget';
  const result = await service.reject(approver, request.id, { reason });
  expect(result).toMatchObject({
    status: 'rejected',
    decisionComment: reason,
    allowedActions: [],
  });
  expect(result.events.at(-1)).toMatchObject({
    type: 'rejected',
    actor: { id: approver.userId },
    fromStatus: 'pending_approval',
    toStatus: 'rejected',
    note: reason,
  });
  await expect(
    service.reject(approver, request.id, { reason }),
  ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  expect(await service.get(employee, request.id)).toEqual(result);
});

it('rolls back hook writes when creation fails', async () => {
  service = new RequestService(db, {
    reserveCreation: async (tx, scopeId) => {
      await tx
        .update(demoSpaces)
        .set({ requestsCreated: sql`${demoSpaces.requestsCreated} + 1` })
        .where(eq(demoSpaces.id, scopeId));
    },
    allocateCode: () => {
      throw new DomainError('QUOTA_EXCEEDED', 'Creation limit reached.');
    },
  });
  await expect(service.create(employee, input)).rejects.toMatchObject({
    code: 'QUOTA_EXCEEDED',
  });
  const [stored] = await db
    .select()
    .from(demoSpaces)
    .where(eq(demoSpaces.id, space.spaceId));
  expect(stored?.requestsCreated).toBe(0);
  expect(await db.select().from(requests)).toHaveLength(0);
  expect(await db.select().from(requestEvents)).toHaveLength(0);
});
