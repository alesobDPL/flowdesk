import { switchIdentitySchema } from '@flowdesk/shared';
import type { FastifyInstance } from 'fastify';
import type { SessionService } from '../../demo/session/session.service.js';

export function registerSession(
  app: FastifyInstance,
  sessions: SessionService,
): void {
  app.get('/session', { preHandler: app.requireSession }, (request) =>
    sessions.info(request.demoSession!),
  );
  app.put(
    '/session/identity',
    { preHandler: app.requireSession },
    (request) => {
      const { identity } = switchIdentitySchema.parse(request.body);
      return sessions.switchIdentity(request.demoSession!, identity);
    },
  );
}
