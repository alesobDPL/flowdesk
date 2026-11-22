import type { FastifyInstance, preHandlerAsyncHookHandler } from 'fastify';
import type {
  ResolvedSession,
  SessionService,
} from '../demo/session/session.service.js';
import { HttpError } from './errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    demoSession: ResolvedSession | null;
  }
  interface FastifyInstance {
    requireSession: preHandlerAsyncHookHandler;
  }
}

export function registerSessionPlugin(
  app: FastifyInstance,
  sessions: SessionService,
): void {
  app.decorateRequest('demoSession', null);
  app.decorate('requireSession', async function requireSession(request) {
    const resolved = await sessions.resolve(request.cookies.fd_session);
    if (resolved.status === 'missing')
      throw new HttpError(401, 'SESSION_REQUIRED', 'A session is required.');
    if (resolved.status === 'expired')
      throw new HttpError(401, 'SESSION_EXPIRED', 'The session has expired.');
    request.demoSession = resolved.session;
    await sessions.touch(resolved.session);
  } satisfies preHandlerAsyncHookHandler);
}
