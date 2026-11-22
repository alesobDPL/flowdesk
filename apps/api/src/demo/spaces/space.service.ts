import { randomUUID } from 'node:crypto';
import {
  DEMO_IDENTITIES,
  type DemoIdentity,
  type Locale,
  type Role,
} from '@flowdesk/shared';
import { and, count, eq, gt, sql } from 'drizzle-orm';
import type { Config } from '../../config.js';
import type { Db } from '../../db/client.js';
import {
  approverAssignments,
  demoSpaces,
  requestEvents,
  requests,
  sessions,
  userRoles,
  users,
} from '../../db/schema.js';
import type { ResolvedSession } from '../session/session.service.js';
import { generateToken } from '../session/token.js';
import { seedContent } from './seed-data.js';

const minute = 60_000;
const day = 24 * 60 * minute;
const identityRoles: Record<DemoIdentity, Role> = {
  employee: 'requester',
  approver: 'approver',
  it_agent: 'it_agent',
};

export class DemoCapacityError extends Error {
  constructor() {
    super('The demo is at capacity.');
    this.name = 'DemoCapacityError';
  }
}

export class DemoSpaceService {
  constructor(
    private readonly db: Db,
    private readonly config: Config,
    private readonly clock: () => Date,
  ) {}

  create(locale: Locale): Promise<{ token: string; hardExpiresAt: Date }> {
    return this.db.transaction(async (tx) => {
      // Serialize capacity reservations across API connections. Released on commit/rollback.
      // This key belongs only to space creation, independently of the cleanup lock.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1178882896)`);
      const now = this.clock();
      const [active] = await tx
        .select({ count: count() })
        .from(demoSpaces)
        .where(
          and(
            eq(demoSpaces.status, 'active'),
            gt(demoSpaces.hardExpiresAt, now),
            gt(
              demoSpaces.lastSeenAt,
              new Date(now.getTime() - this.config.demo.idleMin * minute),
            ),
          ),
        );
      if (active && active.count >= this.config.demo.maxActiveSpaces) {
        throw new DemoCapacityError();
      }

      const spaceId = randomUUID();
      const hardExpiresAt = new Date(
        now.getTime() + this.config.demo.spaceTtlMin * minute,
      );
      await tx.insert(demoSpaces).values({
        id: spaceId,
        createdAt: now,
        hardExpiresAt,
        lastSeenAt: now,
        status: 'active',
        endedAt: null,
        requestSeq: 5,
        requestsCreated: 0,
      });

      const content = seedContent(locale);
      const userIds: Record<DemoIdentity, string> = {
        employee: randomUUID(),
        approver: randomUUID(),
        it_agent: randomUUID(),
      };
      await tx.insert(users).values(
        DEMO_IDENTITIES.map((identity) => ({
          id: userIds[identity],
          demoSpaceId: spaceId,
          demoIdentity: identity,
          ...content.users[identity],
        })),
      );
      await tx.insert(userRoles).values(
        DEMO_IDENTITIES.map((identity) => ({
          demoSpaceId: spaceId,
          userId: userIds[identity],
          role: identityRoles[identity],
        })),
      );
      await tx.insert(approverAssignments).values({
        demoSpaceId: spaceId,
        requestTypeId: 1,
        approverId: userIds.approver,
      });

      for (const sample of content.samples) {
        const requestId = randomUUID();
        const createdAt = new Date(now.getTime() - sample.daysAgo * day);
        const events: (typeof requestEvents.$inferInsert)[] = [
          {
            demoSpaceId: spaceId,
            requestId,
            type: 'created',
            actorId: userIds.employee,
            fromStatus: null,
            toStatus: 'pending_approval',
            note: null,
            createdAt,
          },
        ];
        let decidedAt: Date | null = null;
        let completedAt: Date | null = null;
        if (sample.status !== 'pending_approval') {
          decidedAt = new Date(createdAt.getTime() + 60 * minute);
          events.push({
            demoSpaceId: spaceId,
            requestId,
            type: sample.status === 'rejected' ? 'rejected' : 'approved',
            actorId: userIds.approver,
            fromStatus: 'pending_approval',
            toStatus: sample.status === 'rejected' ? 'rejected' : 'approved',
            note: sample.decisionComment,
            createdAt: decidedAt,
          });
        }
        if (sample.status === 'in_progress' || sample.status === 'completed') {
          events.push({
            demoSpaceId: spaceId,
            requestId,
            type: 'assigned',
            actorId: userIds.it_agent,
            fromStatus: 'approved',
            toStatus: 'in_progress',
            note: null,
            createdAt: new Date(createdAt.getTime() + 120 * minute),
          });
        }
        if (sample.status === 'completed') {
          completedAt = new Date(createdAt.getTime() + 180 * minute);
          events.push({
            demoSpaceId: spaceId,
            requestId,
            type: 'completed',
            actorId: userIds.it_agent,
            fromStatus: 'in_progress',
            toStatus: 'completed',
            note: sample.completionNote,
            createdAt: completedAt,
          });
        }
        await tx.insert(requests).values({
          id: requestId,
          demoSpaceId: spaceId,
          code: sample.code,
          requestTypeId: 1,
          requesterId: userIds.employee,
          approverId: userIds.approver,
          assigneeId: sample.status === 'in_progress' ? userIds.it_agent : null,
          softwareName: sample.softwareName,
          accessLevel: sample.accessLevel,
          justification: sample.justification,
          status: sample.status,
          decisionComment: sample.decisionComment,
          decidedAt,
          completionNote: sample.completionNote,
          completedBy: sample.status === 'completed' ? userIds.it_agent : null,
          completedAt,
          isSample: true,
          version: events.length - 1,
          createdAt,
          updatedAt: events.at(-1)!.createdAt,
        });
        await tx.insert(requestEvents).values(events);
      }

      const { token, hash } = generateToken();
      await tx.insert(sessions).values({
        id: randomUUID(),
        tokenHash: hash,
        demoSpaceId: spaceId,
        activeUserId: userIds.employee,
        createdAt: now,
      });
      return { token, hardExpiresAt };
    });
  }

  async reset(
    session: ResolvedSession,
    locale: Locale,
  ): Promise<{ token: string; hardExpiresAt: Date }> {
    await this.db
      .update(demoSpaces)
      .set({ status: 'ended', endedAt: this.clock() })
      .where(eq(demoSpaces.id, session.spaceId));
    return this.create(locale);
  }
}
