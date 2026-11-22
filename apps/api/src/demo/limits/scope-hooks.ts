import { and, eq, lt, sql } from 'drizzle-orm';
import type { Config } from '../../config.js';
import { DomainError } from '../../core/requests/errors.js';
import type { ScopeHooks } from '../../core/requests/service.js';
import { demoSpaces } from '../../db/schema.js';

export function createDemoScopeHooks(config: Config): ScopeHooks {
  return {
    async reserveCreation(tx, scopeId) {
      const [reserved] = await tx
        .update(demoSpaces)
        .set({
          requestsCreated: sql`${demoSpaces.requestsCreated} + 1`,
        })
        .where(
          and(
            eq(demoSpaces.id, scopeId),
            lt(demoSpaces.requestsCreated, config.demo.maxRequests),
          ),
        )
        .returning({ id: demoSpaces.id });
      if (!reserved)
        throw new DomainError(
          'QUOTA_EXCEEDED',
          'The demo request quota has been reached.',
        );
    },
    async allocateCode(tx, scopeId) {
      const [updated] = await tx
        .update(demoSpaces)
        .set({
          requestSeq: sql`${demoSpaces.requestSeq} + 1`,
        })
        .where(eq(demoSpaces.id, scopeId))
        .returning({ requestSeq: demoSpaces.requestSeq });
      if (!updated) throw new DomainError('NOT_FOUND', 'Demo space not found.');
      return `FD-${String(updated.requestSeq).padStart(4, '0')}`;
    },
  };
}
