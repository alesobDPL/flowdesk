import type { CreateRequestInput, DemoIdentity } from '@flowdesk/shared';
import { and, eq } from 'drizzle-orm';
import { beforeEach, expect, it } from 'vitest';
import { loadConfig } from '../../src/config.js';
import { RequestService } from '../../src/core/requests/service.js';
import { demoSpaces, requests } from '../../src/db/schema.js';
import { createDemoScopeHooks } from '../../src/demo/limits/scope-hooks.js';
import { SessionService } from '../../src/demo/session/session.service.js';
import { DemoSpaceService } from '../../src/demo/spaces/space.service.js';
import { getTourProgress } from '../../src/demo/tour/tour.service.js';
import { getTestDb } from '../helpers/test-db.js';

const config = loadConfig({
  DATABASE_URL: 'postgresql://demo:example@localhost/demo',
});
const clock = () => new Date('2026-11-22T15:00:00.123Z');
const input: CreateRequestInput = {
  softwareName: 'Demo Editor',
  accessLevel: 'edit',
  accessDetail: null,
  justification: 'I need to edit the shared campaign documents.',
  neededBy: null,
  comments: null,
};
const empty = {
  created: false,
  decided: false,
  assigned: false,
  completed: false,
};
let token: string;
let spaceId: string;
let sessions: SessionService;
let service: RequestService;

async function actor(identity: DemoIdentity) {
  const current = await sessions.resolve(token);
  if (current.status !== 'ok') throw new Error('Expected an active session.');
  await sessions.switchIdentity(current.session, identity);
  const switched = await sessions.resolve(token);
  if (switched.status !== 'ok') throw new Error('Expected an active session.');
  return switched.session.actor;
}

beforeEach(async () => {
  const db = getTestDb();
  await db.delete(demoSpaces);
  ({ token } = await new DemoSpaceService(db, config, clock).create('en'));
  sessions = new SessionService(db, config, clock);
  spaceId = (await actor('employee')).scopeId;
  service = new RequestService(db, createDemoScopeHooks(config));
});

it('new space has all false', async () => {
  expect(await getTourProgress(getTestDb(), spaceId)).toEqual(empty);
});

it('progress follows visitor actions', async () => {
  const db = getTestDb();
  const request = await service.create(await actor('employee'), input);
  expect(await getTourProgress(db, spaceId)).toEqual({
    ...empty,
    created: true,
  });
  await service.approve(await actor('approver'), request.id, { comment: null });
  expect(await getTourProgress(db, spaceId)).toEqual({
    ...empty,
    created: true,
    decided: true,
  });
  const agent = await actor('it_agent');
  await service.assign(agent, request.id);
  expect(await getTourProgress(db, spaceId)).toEqual({
    created: true,
    decided: true,
    assigned: true,
    completed: false,
  });
  await service.complete(agent, request.id, { note: 'Access verified.' });
  expect(await getTourProgress(db, spaceId)).toEqual({
    created: true,
    decided: true,
    assigned: true,
    completed: true,
  });
});

it('acting on a sample does not count', async () => {
  const db = getTestDb();
  const [sample] = await db
    .select()
    .from(requests)
    .where(
      and(eq(requests.demoSpaceId, spaceId), eq(requests.code, 'FD-0005')),
    );
  if (!sample) throw new Error('Expected the pending sample.');
  await service.approve(await actor('approver'), sample.id, { comment: null });
  expect(await getTourProgress(db, spaceId)).toEqual(empty);
});

it('a rejection counts as a decision', async () => {
  const request = await service.create(await actor('employee'), input);
  await service.reject(await actor('approver'), request.id, {
    reason: 'An existing editor covers this need.',
  });
  expect(await getTourProgress(getTestDb(), spaceId)).toEqual({
    ...empty,
    created: true,
    decided: true,
  });
});

it('assignment progress persists after release', async () => {
  const request = await service.create(await actor('employee'), input);
  await service.approve(await actor('approver'), request.id, { comment: null });
  const agent = await actor('it_agent');
  await service.assign(agent, request.id);
  await service.release(agent, request.id, {
    reason: 'Waiting for a license to become available.',
  });
  expect(await getTourProgress(getTestDb(), spaceId)).toEqual({
    created: true,
    decided: true,
    assigned: true,
    completed: false,
  });
});

it('progress is isolated from another visitor space', async () => {
  const db = getTestDb();
  const { token: otherToken } = await new DemoSpaceService(
    db,
    config,
    clock,
  ).create('es');
  const other = await sessions.resolve(otherToken);
  if (other.status !== 'ok') throw new Error('Expected an active session.');
  const request = await service.create(await actor('employee'), input);
  await service.approve(await actor('approver'), request.id, { comment: null });
  const agent = await actor('it_agent');
  await service.assign(agent, request.id);
  await service.complete(agent, request.id, { note: null });
  expect(await getTourProgress(db, other.session.spaceId)).toEqual(empty);
});
