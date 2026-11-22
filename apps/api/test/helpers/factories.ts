import { randomUUID } from 'node:crypto';
import type { Db } from '../../src/db/client.js';
import {
  approverAssignments,
  demoSpaces,
  userRoles,
  users,
} from '../../src/db/schema.js';

export async function insertSpace(
  db: Db,
  opts?: Partial<{
    hardExpiresAt: Date;
    lastSeenAt: Date;
    status: 'active' | 'ended';
    endedAt: Date;
  }>,
): Promise<{
  spaceId: string;
  employeeId: string;
  approverId: string;
  agentId: string;
}> {
  const spaceId = randomUUID();
  const employeeId = randomUUID();
  const approverId = randomUUID();
  const agentId = randomUUID();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(demoSpaces).values({
      id: spaceId,
      createdAt: now,
      hardExpiresAt:
        opts?.hardExpiresAt ?? new Date(now.getTime() + 120 * 60_000),
      lastSeenAt: opts?.lastSeenAt ?? now,
      status: opts?.status ?? 'active',
      endedAt: opts?.endedAt ?? null,
      requestSeq: 0,
      requestsCreated: 0,
    });
    await tx.insert(users).values([
      {
        id: employeeId,
        demoSpaceId: spaceId,
        displayName: 'Test Employee',
        jobTitle: 'Employee',
        demoIdentity: 'employee',
      },
      {
        id: approverId,
        demoSpaceId: spaceId,
        displayName: 'Test Approver',
        jobTitle: 'Approver',
        demoIdentity: 'approver',
      },
      {
        id: agentId,
        demoSpaceId: spaceId,
        displayName: 'Test Agent',
        jobTitle: 'IT agent',
        demoIdentity: 'it_agent',
      },
    ]);
    await tx.insert(userRoles).values([
      { demoSpaceId: spaceId, userId: employeeId, role: 'requester' },
      { demoSpaceId: spaceId, userId: approverId, role: 'approver' },
      { demoSpaceId: spaceId, userId: agentId, role: 'it_agent' },
    ]);
    await tx.insert(approverAssignments).values({
      demoSpaceId: spaceId,
      requestTypeId: 1,
      approverId,
    });
  });

  return { spaceId, employeeId, approverId, agentId };
}
