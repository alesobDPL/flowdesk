import type { DemoIdentity } from '@flowdesk/shared';

export function homePathFor(
  identity: DemoIdentity,
): '/app/requests' | '/app/approvals' | '/app/queue' {
  const paths = {
    employee: '/app/requests',
    approver: '/app/approvals',
    it_agent: '/app/queue',
  } as const;
  return paths[identity];
}
