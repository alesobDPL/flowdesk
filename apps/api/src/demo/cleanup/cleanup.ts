import { performance } from 'node:perf_hooks';
import { and, asc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import type { Config } from '../../config.js';
import type { Db } from '../../db/client.js';
import { demoSpaces } from '../../db/schema.js';

const minute = 60_000;
// Distinct from the space creation lock (1178882896).
const cleanupLockKey = 1178882897;

export async function runCleanup(
  db: Db,
  config: Config,
  now: Date,
): Promise<{ deletedSpaces: number; skipped: boolean }> {
  // A transaction pins all statements to one connection. PostgreSQL releases the
  // advisory lock on either commit or rollback, including when a batch fails.
  return db.transaction(async (tx) => {
    const lock = await tx.execute<{ acquired: boolean }>(
      sql`SELECT pg_try_advisory_xact_lock(${cleanupLockKey}) AS acquired`,
    );
    if (!lock.rows[0]?.acquired) return { deletedSpaces: 0, skipped: true };

    const graceCutoff = new Date(
      now.getTime() - config.demo.cleanupGraceMin * minute,
    );
    const idleCutoff = new Date(
      now.getTime() -
        (config.demo.idleMin + config.demo.cleanupGraceMin) * minute,
    );
    let deletedSpaces = 0;
    for (;;) {
      const candidates = tx
        .select({ id: demoSpaces.id })
        .from(demoSpaces)
        .where(
          or(
            lt(demoSpaces.hardExpiresAt, graceCutoff),
            lt(demoSpaces.lastSeenAt, idleCutoff),
            and(
              eq(demoSpaces.status, 'ended'),
              lt(demoSpaces.endedAt, graceCutoff),
            ),
          ),
        )
        .orderBy(asc(demoSpaces.createdAt), asc(demoSpaces.id))
        .limit(config.demo.cleanupBatch);
      const deleted = await tx
        .delete(demoSpaces)
        .where(inArray(demoSpaces.id, candidates))
        .returning({ id: demoSpaces.id });
      deletedSpaces += deleted.length;
      if (deleted.length < config.demo.cleanupBatch)
        return { deletedSpaces, skipped: false };
    }
  });
}

export function startCleanupScheduler(
  db: Db,
  config: Config,
  logger: FastifyBaseLogger,
): () => void {
  async function run(): Promise<void> {
    const started = performance.now();
    try {
      const result = await runCleanup(db, config, new Date());
      logger.info(
        { ...result, durationMs: performance.now() - started },
        'Demo cleanup finished.',
      );
    } catch (err) {
      logger.error({ err }, 'Demo cleanup failed.');
    }
  }
  const timer = setInterval(() => {
    void run();
  }, config.demo.cleanupIntervalMin * minute);
  timer.unref();
  return () => {
    clearInterval(timer);
  };
}
