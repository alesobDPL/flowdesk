import {
  REQUEST_ACTIONS,
  REQUEST_STATUSES,
  type RequestAction,
  type RequestStatus,
} from '@flowdesk/shared';
import { describe, expect, it } from 'vitest';
import type { Actor } from '../../src/core/actor.js';
import {
  DomainError,
  type DomainErrorCode,
} from '../../src/core/requests/errors.js';
import {
  allowedActions,
  authorize,
  canCreate,
  canView,
  type RequestFacts,
} from '../../src/core/requests/policies.js';

const employee: Actor = {
  userId: 'employee',
  roles: ['requester'],
  scopeId: 'space',
};
const approver: Actor = {
  userId: 'approver',
  roles: ['approver'],
  scopeId: 'space',
};
const agent: Actor = {
  userId: 'agent',
  roles: ['it_agent'],
  scopeId: 'space',
};
const pending: RequestFacts = {
  requesterId: employee.userId,
  approverId: approver.userId,
  assigneeId: null,
  status: 'pending_approval',
};
const approved: RequestFacts = { ...pending, status: 'approved' };
const inProgress: RequestFacts = {
  ...pending,
  status: 'in_progress',
  assigneeId: agent.userId,
};

function expectDenied(
  actor: Actor,
  action: RequestAction,
  req: RequestFacts,
  code: DomainErrorCode,
) {
  const attempt = () => authorize(actor, action, req);
  expect(attempt).toThrowError(DomainError);
  expect(attempt).toThrowError(expect.objectContaining({ code }));
}

describe('creation and visibility', () => {
  it('only requester can create', () => {
    expect(canCreate(employee)).toBe(true);
    expect(canCreate(approver)).toBe(false);
    expect(canCreate(agent)).toBe(false);
    expect(canCreate({ ...employee, roles: [] })).toBe(false);
    expect(canCreate({ ...employee, roles: ['requester', 'approver'] })).toBe(
      true,
    );
  });

  it.each(REQUEST_STATUSES)('employee sees only own requests: %s', (status) => {
    expect(canView(employee, { ...pending, status })).toBe(true);
    expect(
      canView(employee, { ...pending, status, requesterId: 'other' }),
    ).toBe(false);
  });

  it.each(REQUEST_STATUSES)(
    'approver sees only requests assigned to them: %s',
    (status) => {
      expect(canView(approver, { ...pending, status })).toBe(true);
      expect(
        canView(approver, { ...pending, status, approverId: 'other' }),
      ).toBe(false);
    },
  );

  it.each<[RequestStatus, boolean]>([
    ['pending_approval', false],
    ['rejected', false],
    ['approved', true],
    ['in_progress', true],
    ['completed', true],
  ])(
    'agent sees approved, in_progress and completed only: %s',
    (status, visible) => {
      expect(canView(agent, { ...pending, status })).toBe(visible);
    },
  );

  it('combines visibility from all roles', () => {
    const actor: Actor = {
      ...employee,
      roles: ['requester', 'approver', 'it_agent'],
    };
    expect(canView(actor, pending)).toBe(true);
    expect(
      canView(actor, {
        ...pending,
        requesterId: 'other',
        approverId: actor.userId,
      }),
    ).toBe(true);
    expect(canView(actor, { ...approved, requesterId: 'other' })).toBe(true);
    expect(canView(actor, { ...pending, requesterId: 'other' })).toBe(false);
  });

  it('does not grant visibility without a role', () => {
    expect(canView({ ...employee, roles: [] }, pending)).toBe(false);
  });
});

describe('authorize', () => {
  it.each(REQUEST_ACTIONS)(
    'hides invisible requests before checking %s',
    (action) => {
      expectDenied(agent, action, pending, 'NOT_FOUND');
      expectDenied(
        employee,
        action,
        { ...pending, requesterId: 'other' },
        'NOT_FOUND',
      );
    },
  );

  it('agent cannot approve an approved request', () => {
    expectDenied(agent, 'approve', approved, 'FORBIDDEN');
  });

  it.each(['approve', 'reject'] as const)(
    'cannot approve own request even with both roles: %s',
    (action) => {
      const actor: Actor = { ...employee, roles: ['requester', 'approver'] };
      expectDenied(
        actor,
        action,
        { ...pending, approverId: actor.userId },
        'FORBIDDEN',
      );
    },
  );

  it.each(['approve', 'reject'] as const)(
    'non-designated approver cannot decide a visible request: %s',
    (action) => {
      const actor: Actor = { ...agent, roles: ['approver', 'it_agent'] };
      expectDenied(actor, action, approved, 'FORBIDDEN');
    },
  );

  it('cannot assign own request even as it_agent', () => {
    const actor: Actor = { ...employee, roles: ['requester', 'it_agent'] };
    expectDenied(actor, 'assign', approved, 'FORBIDDEN');
  });

  it('cannot complete own request', () => {
    const actor: Actor = { ...employee, roles: ['requester', 'it_agent'] };
    expectDenied(
      actor,
      'complete',
      { ...inProgress, assigneeId: actor.userId },
      'FORBIDDEN',
    );
  });

  it('second agent assigning an in_progress request gets INVALID_TRANSITION', () => {
    expectDenied(
      { ...agent, userId: 'second-agent' },
      'assign',
      inProgress,
      'INVALID_TRANSITION',
    );
  });

  it.each(['release', 'complete'] as const)(
    'non-assignee agent cannot release or complete: %s',
    (action) => {
      expectDenied(
        { ...agent, userId: 'second-agent' },
        action,
        inProgress,
        'FORBIDDEN',
      );
      expectDenied(agent, action, approved, 'FORBIDDEN');
    },
  );

  it.each(REQUEST_ACTIONS)(
    'requester cannot perform %s on a visible request',
    (action) => {
      expectDenied(employee, action, pending, 'FORBIDDEN');
    },
  );

  it('assign requires an unassigned request even in approved status', () => {
    expectDenied(
      agent,
      'assign',
      { ...approved, assigneeId: 'other' },
      'INVALID_TRANSITION',
    );
  });

  it.each<[Actor, RequestAction, RequestFacts]>([
    [approver, 'approve', pending],
    [approver, 'reject', pending],
    [agent, 'assign', approved],
    [agent, 'release', inProgress],
    [agent, 'complete', inProgress],
  ])('allows authorized transition by $0.userId: %s', (actor, action, req) => {
    expect(() => authorize(actor, action, req)).not.toThrow();
  });

  it.each<[Actor, RequestAction, RequestFacts]>([
    [approver, 'approve', approved],
    [approver, 'reject', { ...pending, status: 'rejected' }],
    [agent, 'assign', { ...approved, status: 'completed' }],
    [agent, 'release', { ...inProgress, status: 'completed' }],
    [agent, 'complete', { ...inProgress, status: 'completed' }],
  ])(
    'rejects invalid state after checking permission: %s',
    (actor, action, req) => {
      expectDenied(actor, action, req, 'INVALID_TRANSITION');
    },
  );
});

describe('allowedActions', () => {
  it.each<[Actor, RequestFacts, RequestAction[]]>([
    [approver, pending, ['approve', 'reject']],
    [agent, approved, ['assign']],
    [agent, inProgress, ['release', 'complete']],
    [employee, pending, []],
    [employee, approved, []],
    [agent, pending, []],
    [agent, { ...approved, assigneeId: 'other' }, []],
    [{ ...agent, userId: 'second-agent' }, inProgress, []],
    [approver, { ...pending, status: 'rejected' }, []],
    [agent, { ...inProgress, status: 'completed' }, []],
    [
      { ...employee, roles: ['requester', 'approver'] },
      { ...pending, approverId: employee.userId },
      [],
    ],
    [{ ...employee, roles: ['requester', 'it_agent'] }, approved, []],
    [
      { ...employee, roles: ['requester', 'it_agent'] },
      { ...inProgress, assigneeId: employee.userId },
      [],
    ],
  ])(
    'returns permitted actions for $0.userId on $1.status',
    (actor, req, actions) => {
      expect(allowedActions(actor, req)).toEqual(actions);
    },
  );
});
