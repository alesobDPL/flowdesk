import { randomUUID } from 'node:crypto';
import type {
  CreateRequestInput,
  listQuerySchema,
  RequestAction,
  RequestStatus,
} from '@flowdesk/shared';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { Db, Tx } from '../../db/client.js';
import {
  approverAssignments,
  requestEvents,
  requests,
  users,
} from '../../db/schema.js';
import type { Actor } from '../actor.js';

export type ListQuery = ReturnType<typeof listQuerySchema.parse>;
export type RequestRow = typeof requests.$inferSelect;
export type EventRow = typeof requestEvents.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type RequestChanges = {
  status: RequestStatus;
} & Partial<
  Pick<
    RequestRow,
    | 'decisionComment'
    | 'decidedAt'
    | 'assigneeId'
    | 'completedBy'
    | 'completedAt'
    | 'completionNote'
  >
>;

export async function findApprover(tx: Tx, scopeId: string) {
  const [assignment] = await tx
    .select({ approverId: approverAssignments.approverId })
    .from(approverAssignments)
    .where(
      and(
        eq(approverAssignments.demoSpaceId, scopeId),
        eq(approverAssignments.requestTypeId, 1),
      ),
    )
    .limit(1);
  return assignment?.approverId;
}

export async function findRequest(db: Db | Tx, scopeId: string, id: string) {
  const [request] = await db
    .select()
    .from(requests)
    .where(and(eq(requests.demoSpaceId, scopeId), eq(requests.id, id)))
    .limit(1);
  return request;
}

export function findEvents(db: Db | Tx, scopeId: string, requestId: string) {
  return db
    .select()
    .from(requestEvents)
    .where(
      and(
        eq(requestEvents.demoSpaceId, scopeId),
        eq(requestEvents.requestId, requestId),
      ),
    )
    .orderBy(asc(requestEvents.createdAt), asc(requestEvents.id));
}

export function findUsers(db: Db | Tx, scopeId: string, ids: string[]) {
  return db
    .select()
    .from(users)
    .where(and(eq(users.demoSpaceId, scopeId), inArray(users.id, ids)));
}

export async function insertRequest(
  tx: Tx,
  actor: Actor,
  input: CreateRequestInput,
  approverId: string,
  code: string,
  now: Date,
): Promise<RequestRow> {
  const [request] = await tx
    .insert(requests)
    .values({
      ...input,
      id: randomUUID(),
      demoSpaceId: actor.scopeId,
      code,
      requestTypeId: 1,
      requesterId: actor.userId,
      approverId,
      status: 'pending_approval',
      isSample: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!request) throw new Error('Request insertion returned no row.');
  return request;
}

export function insertEvent(
  tx: Tx,
  scopeId: string,
  event: Omit<typeof requestEvents.$inferInsert, 'demoSpaceId' | 'id'>,
) {
  return tx.insert(requestEvents).values({ ...event, demoSpaceId: scopeId });
}

export async function updateRequest(
  tx: Tx,
  actor: Actor,
  current: RequestRow,
  action: RequestAction,
  changes: RequestChanges,
  now: Date,
) {
  const conditions = [
    eq(requests.demoSpaceId, actor.scopeId),
    eq(requests.id, current.id),
    eq(requests.status, current.status),
    eq(requests.version, current.version),
    ne(requests.requesterId, actor.userId),
  ];
  if (action === 'assign') conditions.push(isNull(requests.assigneeId));
  if (action === 'approve' || action === 'reject') {
    conditions.push(eq(requests.approverId, actor.userId));
  }
  if (action === 'release' || action === 'complete') {
    conditions.push(eq(requests.assigneeId, actor.userId));
  }
  const [updated] = await tx
    .update(requests)
    .set({
      ...changes,
      version: sql`${requests.version} + 1`,
      updatedAt: now,
    })
    .where(and(...conditions))
    .returning();
  return updated;
}

function viewCondition(actor: Actor, view: ListQuery['view']): SQL {
  switch (view) {
    case 'mine':
      return eq(requests.requesterId, actor.userId);
    case 'approvals_pending':
      return and(
        eq(requests.approverId, actor.userId),
        eq(requests.status, 'pending_approval'),
      )!;
    case 'approvals_decided':
      return and(
        eq(requests.approverId, actor.userId),
        ne(requests.status, 'pending_approval'),
      )!;
    case 'queue':
      return eq(requests.status, 'approved');
    case 'assigned':
      return and(
        eq(requests.status, 'in_progress'),
        eq(requests.assigneeId, actor.userId),
      )!;
    case 'completed':
      return eq(requests.status, 'completed');
  }
}

export function listRequests(db: Db, actor: Actor, query: ListQuery) {
  const conditions = [
    eq(requests.demoSpaceId, actor.scopeId),
    viewCondition(actor, query.view),
  ];
  if (query.status) conditions.push(eq(requests.status, query.status));
  const q = query.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push(
      or(ilike(requests.code, pattern), ilike(requests.softwareName, pattern))!,
    );
  }
  if (query.cursor) {
    const cursor = Buffer.from(query.cursor, 'base64url').toString('utf8');
    const separator = cursor.indexOf('|');
    const createdAt = new Date(cursor.slice(0, separator));
    const id = cursor.slice(separator + 1);
    conditions.push(
      or(
        lt(requests.createdAt, createdAt),
        and(eq(requests.createdAt, createdAt), lt(requests.id, id)),
      )!,
    );
  }
  return db
    .select({ request: requests, requester: users })
    .from(requests)
    .innerJoin(
      users,
      and(
        eq(users.demoSpaceId, requests.demoSpaceId),
        eq(users.id, requests.requesterId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(requests.createdAt), desc(requests.id))
    .limit(21);
}
