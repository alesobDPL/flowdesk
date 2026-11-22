import type {
  CreateRequestInput,
  EventType,
  Page,
  RequestAction,
  RequestDetail,
  RequestSummary,
  Role,
} from '@flowdesk/shared';
import type { Db, Tx } from '../../db/client.js';
import type { Actor } from '../actor.js';
import { DomainError } from './errors.js';
import { toRequestDetail, toRequestSummary } from './mappers.js';
import { authorize, canCreate, canView } from './policies.js';
import {
  findApprover,
  findEvents,
  findRequest,
  findUsers,
  insertEvent,
  insertRequest,
  listRequests,
  updateRequest,
  type ListQuery,
  type RequestChanges,
  type RequestRow,
} from './repository.js';
import { nextStatus } from './state-machine.js';

export interface ScopeHooks {
  reserveCreation(tx: Tx, scopeId: string): Promise<void>;
  allocateCode(tx: Tx, scopeId: string): Promise<string>;
}

const viewRoles: Record<ListQuery['view'], Role> = {
  mine: 'requester',
  approvals_pending: 'approver',
  approvals_decided: 'approver',
  queue: 'it_agent',
  assigned: 'it_agent',
  completed: 'it_agent',
};

const eventTypes: Record<RequestAction, EventType> = {
  approve: 'approved',
  reject: 'rejected',
  assign: 'assigned',
  release: 'released',
  complete: 'completed',
};

export class RequestService {
  constructor(
    private readonly db: Db,
    private readonly hooks: ScopeHooks,
  ) {}

  create(actor: Actor, input: CreateRequestInput): Promise<RequestDetail> {
    return this.db.transaction(async (tx) => {
      if (!canCreate(actor)) {
        throw new DomainError(
          'FORBIDDEN',
          'Request creation is not permitted.',
        );
      }
      const approverId = await findApprover(tx, actor.scopeId);
      if (!approverId) {
        throw new DomainError(
          'APPROVER_NOT_CONFIGURED',
          'No approver is configured.',
        );
      }
      if (approverId === actor.userId) {
        throw new DomainError(
          'SELF_APPROVAL_CONFLICT',
          'Requester cannot be the approver.',
        );
      }
      await this.hooks.reserveCreation(tx, actor.scopeId);
      const code = await this.hooks.allocateCode(tx, actor.scopeId);
      const now = new Date();
      const request = await insertRequest(
        tx,
        actor,
        input,
        approverId,
        code,
        now,
      );
      await insertEvent(tx, actor.scopeId, {
        requestId: request.id,
        type: 'created',
        actorId: actor.userId,
        fromStatus: null,
        toStatus: 'pending_approval',
        note: null,
        createdAt: now,
      });
      return this.detail(tx, actor, request);
    });
  }

  async list(actor: Actor, query: ListQuery): Promise<Page<RequestSummary>> {
    if (!actor.roles.includes(viewRoles[query.view])) {
      throw new DomainError('FORBIDDEN', 'Request list view is not permitted.');
    }
    const rows = await listRequests(this.db, actor, query);
    const items = rows
      .slice(0, 20)
      .map(({ request, requester }) => toRequestSummary(request, requester));
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        rows.length > 20 && last
          ? Buffer.from(`${last.createdAt}|${last.id}`).toString('base64url')
          : null,
    };
  }

  async get(actor: Actor, id: string): Promise<RequestDetail> {
    const request = await findRequest(this.db, actor.scopeId, id);
    if (!request || !canView(actor, request)) {
      throw new DomainError('NOT_FOUND', 'Request not found.');
    }
    return this.detail(this.db, actor, request);
  }

  approve(
    actor: Actor,
    id: string,
    input: { comment: string | null },
  ): Promise<RequestDetail> {
    return this.transition(actor, id, 'approve', input.comment);
  }

  reject(
    actor: Actor,
    id: string,
    input: { reason: string },
  ): Promise<RequestDetail> {
    return this.transition(actor, id, 'reject', input.reason);
  }

  assign(actor: Actor, id: string): Promise<RequestDetail> {
    return this.transition(actor, id, 'assign', null);
  }

  release(
    actor: Actor,
    id: string,
    input: { reason: string },
  ): Promise<RequestDetail> {
    return this.transition(actor, id, 'release', input.reason);
  }

  complete(
    actor: Actor,
    id: string,
    input: { note: string | null },
  ): Promise<RequestDetail> {
    return this.transition(actor, id, 'complete', input.note);
  }

  private transition(
    actor: Actor,
    id: string,
    action: RequestAction,
    note: string | null,
  ): Promise<RequestDetail> {
    return this.db.transaction(async (tx) => {
      const request = await findRequest(tx, actor.scopeId, id);
      if (!request) throw new DomainError('NOT_FOUND', 'Request not found.');
      authorize(actor, action, request);
      const status = nextStatus(request.status, action);
      if (status === null) {
        throw new DomainError(
          'INVALID_TRANSITION',
          'Request transition is invalid.',
        );
      }
      const now = new Date();
      const changes: RequestChanges = { status };
      switch (action) {
        case 'approve':
        case 'reject':
          changes.decisionComment = note;
          changes.decidedAt = now;
          break;
        case 'assign':
          changes.assigneeId = actor.userId;
          break;
        case 'release':
          changes.assigneeId = null;
          break;
        case 'complete':
          changes.assigneeId = null;
          changes.completedBy = actor.userId;
          changes.completedAt = now;
          changes.completionNote = note;
          break;
      }
      const updated = await updateRequest(
        tx,
        actor,
        request,
        action,
        changes,
        now,
      );
      if (!updated) {
        throw new DomainError(
          'INVALID_TRANSITION',
          'Request changed before the transition.',
        );
      }
      await insertEvent(tx, actor.scopeId, {
        requestId: id,
        type: eventTypes[action],
        actorId: actor.userId,
        fromStatus: request.status,
        toStatus: status,
        note,
        createdAt: now,
      });
      return this.detail(tx, actor, updated);
    });
  }

  private async detail(
    db: Db | Tx,
    actor: Actor,
    request: RequestRow,
  ): Promise<RequestDetail> {
    const events = await findEvents(db, actor.scopeId, request.id);
    const ids = new Set([request.requesterId, request.approverId]);
    if (request.assigneeId !== null) ids.add(request.assigneeId);
    if (request.completedBy !== null) ids.add(request.completedBy);
    for (const event of events) ids.add(event.actorId);
    const users = await findUsers(db, actor.scopeId, [...ids]);
    return toRequestDetail(actor, request, users, events);
  }
}
