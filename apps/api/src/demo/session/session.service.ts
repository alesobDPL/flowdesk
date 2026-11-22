import {
  DEMO_IDENTITIES,
  type DemoIdentity,
  type SessionInfo,
} from '@flowdesk/shared';
import { and, eq, lt, type SQL } from 'drizzle-orm';
import type { Config } from '../../config.js';
import type { Actor } from '../../core/actor.js';
import { DomainError } from '../../core/requests/errors.js';
import type { Db } from '../../db/client.js';
import { demoSpaces, sessions, userRoles, users } from '../../db/schema.js';
import { hashToken } from './token.js';

export type ResolvedSession = {
  sessionId: string;
  spaceId: string;
  actor: Actor;
  activeIdentity: DemoIdentity;
  hardExpiresAt: Date;
  lastSeenAt: Date;
};

export type ResolveResult =
  | { status: 'ok'; session: ResolvedSession }
  | { status: 'missing' }
  | { status: 'expired' };

const minute = 60_000;

export class SessionService {
  constructor(
    private readonly db: Db,
    private readonly config: Config,
    private readonly clock: () => Date,
  ) {}

  async resolve(token: string | undefined): Promise<ResolveResult> {
    if (token === undefined) return { status: 'missing' };
    const [row] = await this.findSession(
      eq(sessions.tokenHash, hashToken(token)),
    );
    if (!row) return { status: 'missing' };
    const now = this.clock().getTime();
    if (
      row.space.status !== 'active' ||
      now >= row.space.hardExpiresAt.getTime() ||
      now >= row.space.lastSeenAt.getTime() + this.config.demo.idleMin * minute
    ) {
      return { status: 'expired' };
    }
    if (row.user.demoIdentity === null)
      throw new Error('Session user has no demo identity.');
    return {
      status: 'ok',
      session: {
        sessionId: row.session.id,
        spaceId: row.space.id,
        actor: {
          userId: row.user.id,
          roles: await this.roles(row.space.id, row.user.id),
          scopeId: row.space.id,
        },
        activeIdentity: row.user.demoIdentity,
        hardExpiresAt: row.space.hardExpiresAt,
        lastSeenAt: row.space.lastSeenAt,
      },
    };
  }

  async touch(session: ResolvedSession): Promise<void> {
    const now = this.clock();
    const [updated] = await this.db
      .update(demoSpaces)
      .set({ lastSeenAt: now })
      .where(
        and(
          eq(demoSpaces.id, session.spaceId),
          lt(demoSpaces.lastSeenAt, new Date(now.getTime() - minute)),
        ),
      )
      .returning({ lastSeenAt: demoSpaces.lastSeenAt });
    if (updated) session.lastSeenAt = updated.lastSeenAt;
  }

  async info(session: ResolvedSession): Promise<SessionInfo> {
    const [row] = await this.findSession(
      and(
        eq(sessions.id, session.sessionId),
        eq(sessions.demoSpaceId, session.spaceId),
      )!,
    );
    if (!row || row.user.demoIdentity === null)
      throw new Error('Demo session not found.');
    const people = await this.db
      .select()
      .from(users)
      .where(eq(users.demoSpaceId, session.spaceId));
    return {
      activeIdentity: row.user.demoIdentity,
      user: {
        id: row.user.id,
        displayName: row.user.displayName,
        jobTitle: row.user.jobTitle,
      },
      roles: await this.roles(session.spaceId, row.user.id),
      identities: DEMO_IDENTITIES.map((identity) => {
        const person = people.find((p) => p.demoIdentity === identity);
        if (!person) throw new Error('Demo identity not found.');
        return {
          identity,
          user: {
            id: person.id,
            displayName: person.displayName,
            jobTitle: person.jobTitle,
          },
        };
      }),
      expiresAt: new Date(
        Math.min(
          row.space.hardExpiresAt.getTime(),
          row.space.lastSeenAt.getTime() + this.config.demo.idleMin * minute,
        ),
      ).toISOString(),
    };
  }

  async switchIdentity(
    session: ResolvedSession,
    identity: DemoIdentity,
  ): Promise<SessionInfo> {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.demoSpaceId, session.spaceId),
          eq(users.demoIdentity, identity),
        ),
      );
    if (!user) throw new DomainError('NOT_FOUND', 'Demo identity not found.');
    const [updated] = await this.db
      .update(sessions)
      .set({ activeUserId: user.id })
      .where(
        and(
          eq(sessions.id, session.sessionId),
          eq(sessions.demoSpaceId, session.spaceId),
        ),
      )
      .returning({ id: sessions.id });
    if (!updated) throw new DomainError('NOT_FOUND', 'Demo session not found.');
    return this.info(session);
  }

  private findSession(condition: SQL) {
    return this.db
      .select({ session: sessions, space: demoSpaces, user: users })
      .from(sessions)
      .innerJoin(demoSpaces, eq(demoSpaces.id, sessions.demoSpaceId))
      .innerJoin(
        users,
        and(
          eq(users.id, sessions.activeUserId),
          eq(users.demoSpaceId, sessions.demoSpaceId),
        ),
      )
      .where(condition)
      .limit(1);
  }

  private async roles(spaceId: string, userId: string) {
    const rows = await this.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(
        and(eq(userRoles.demoSpaceId, spaceId), eq(userRoles.userId, userId)),
      );
    return rows.map((row) => row.role);
  }
}
