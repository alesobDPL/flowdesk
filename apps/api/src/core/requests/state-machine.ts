import type { RequestAction, RequestStatus } from '@flowdesk/shared';

const transitions: Record<
  RequestStatus,
  Partial<Record<RequestAction, RequestStatus>>
> = {
  pending_approval: { approve: 'approved', reject: 'rejected' },
  rejected: {},
  approved: { assign: 'in_progress' },
  in_progress: { release: 'approved', complete: 'completed' },
  completed: {},
};

export function nextStatus(
  from: RequestStatus,
  action: RequestAction,
): RequestStatus | null {
  return transitions[from][action] ?? null;
}
