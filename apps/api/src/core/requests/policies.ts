import {
  REQUEST_ACTIONS,
  type RequestAction,
  type RequestStatus,
} from '@flowdesk/shared';
import type { Actor } from '../actor.js';
import { DomainError } from './errors.js';
import { nextStatus } from './state-machine.js';

export type RequestFacts = {
  requesterId: string;
  approverId: string;
  assigneeId: string | null;
  status: RequestStatus;
};

export function canCreate(actor: Actor): boolean {
  return actor.roles.includes('requester');
}

export function canView(actor: Actor, req: RequestFacts): boolean {
  return (
    (actor.roles.includes('requester') && req.requesterId === actor.userId) ||
    (actor.roles.includes('approver') && req.approverId === actor.userId) ||
    (actor.roles.includes('it_agent') &&
      (req.status === 'approved' ||
        req.status === 'in_progress' ||
        req.status === 'completed'))
  );
}

function hasActionPermission(
  actor: Actor,
  action: RequestAction,
  req: RequestFacts,
): boolean {
  switch (action) {
    case 'approve':
    case 'reject':
      return (
        actor.roles.includes('approver') &&
        req.approverId === actor.userId &&
        req.requesterId !== actor.userId
      );
    case 'assign':
      return (
        actor.roles.includes('it_agent') && req.requesterId !== actor.userId
      );
    case 'release':
    case 'complete':
      return (
        actor.roles.includes('it_agent') &&
        req.assigneeId === actor.userId &&
        req.requesterId !== actor.userId
      );
  }
}

function isValidTransition(action: RequestAction, req: RequestFacts): boolean {
  return (
    nextStatus(req.status, action) !== null &&
    (action !== 'assign' || req.assigneeId === null)
  );
}

export function allowedActions(
  actor: Actor,
  req: RequestFacts,
): RequestAction[] {
  if (!canView(actor, req)) return [];

  return REQUEST_ACTIONS.filter(
    (action) =>
      hasActionPermission(actor, action, req) && isValidTransition(action, req),
  );
}

export function authorize(
  actor: Actor,
  action: RequestAction,
  req: RequestFacts,
): void {
  if (!canView(actor, req)) {
    throw new DomainError('NOT_FOUND', 'Request not found.');
  }
  if (!hasActionPermission(actor, action, req)) {
    throw new DomainError('FORBIDDEN', 'Action is not permitted.');
  }
  if (!isValidTransition(action, req)) {
    throw new DomainError(
      'INVALID_TRANSITION',
      'Request transition is invalid.',
    );
  }
}
