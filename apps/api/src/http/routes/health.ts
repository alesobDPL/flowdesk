import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { Db } from '../../db/client.js';
import { errorBody } from '../errors.js';

export function registerHealth(app: FastifyInstance, db: Db): void {
  app.get('/health', async (request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: 'ok' };
    } catch (err) {
      request.log.error({ err }, 'Health probe failed.');
      return reply.code(503).send(
        errorBody('INTERNAL_ERROR', 'The service is unavailable.', {
          requestId: request.id,
        }),
      );
    }
  });
}
