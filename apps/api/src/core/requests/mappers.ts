import type { RequestDetail, RequestSummary, UserRef } from '@flowdesk/shared';
import type { Actor } from '../actor.js';
import { allowedActions } from './policies.js';
import type { EventRow, RequestRow, UserRow } from './repository.js';

function toUserRef(user: UserRow): UserRef {
  return {
    id: user.id,
    displayName: user.displayName,
    jobTitle: user.jobTitle,
  };
}

export function toRequestSummary(
  request: RequestRow,
  requester: UserRef,
): RequestSummary {
  return {
    id: request.id,
    code: request.code,
    softwareName: request.softwareName,
    accessLevel: request.accessLevel,
    status: request.status,
    requester: {
      id: requester.id,
      displayName: requester.displayName,
      jobTitle: requester.jobTitle,
    },
    createdAt: request.createdAt.toISOString(),
  };
}

export function toRequestDetail(
  actor: Actor,
  request: RequestRow,
  users: UserRow[],
  events: EventRow[],
): RequestDetail {
  const people = new Map(users.map((user) => [user.id, toUserRef(user)]));
  function person(id: string): UserRef {
    const user = people.get(id);
    if (!user) throw new Error('Request references a missing user.');
    return user;
  }
  return {
    ...toRequestSummary(request, person(request.requesterId)),
    accessDetail: request.accessDetail,
    justification: request.justification,
    neededBy: request.neededBy,
    comments: request.comments,
    approver: person(request.approverId),
    assignee: request.assigneeId === null ? null : person(request.assigneeId),
    decisionComment: request.decisionComment,
    decidedAt: request.decidedAt?.toISOString() ?? null,
    completionNote: request.completionNote,
    completedBy:
      request.completedBy === null ? null : person(request.completedBy),
    completedAt: request.completedAt?.toISOString() ?? null,
    isSample: request.isSample,
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      actor: person(event.actorId),
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      note: event.note,
      createdAt: event.createdAt.toISOString(),
    })),
    allowedActions: allowedActions(actor, request),
  };
}
