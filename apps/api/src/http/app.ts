import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from '../config.js';
import type { Db } from '../db/client.js';
import { startCleanupScheduler } from '../demo/cleanup/cleanup.js';
import { SessionService } from '../demo/session/session.service.js';
import { hashToken } from '../demo/session/token.js';
import { HttpError, registerErrors } from './errors.js';
import { serializeRequest } from './logging.js';
import { registerOriginGuard } from './origin-guard.js';
import { registerHealth } from './routes/health.js';
import { registerSessionPlugin } from './session-plugin.js';

export type AppDeps = {
  config: Config;
  db: Db;
  clock?: () => Date;
  startScheduler?: boolean;
};

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
  }
}

export async function buildApp({
  config,
  db,
  clock = () => new Date(),
  startScheduler = false,
}: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: config.bodyLimitBytes,
    trustProxy: config.trustProxyCidr ?? false,
    logger: { level: config.logLevel, serializers: { req: serializeRequest } },
  });
  app.decorate('config', config);
  registerErrors(app);
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: config.demo.rateLimitPerMin,
    timeWindow: 60_000,
    keyGenerator: (request) =>
      request.cookies.fd_session !== undefined
        ? `session:${hashToken(request.cookies.fd_session).toString('hex')}`
        : `ip:${request.ip}`,
    errorResponseBuilder: () =>
      new HttpError(
        429,
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
      ),
  });
  registerOriginGuard(app, config.appOrigin);
  registerSessionPlugin(app, new SessionService(db, config, clock));
  // Leave booting to inject/listen so tests and Task 9 can register routes.
  void app.register(
    (api, _options, done) => {
      registerHealth(api, db);
      // Foundation handler; Task 9 replaces this with SessionInfo.
      api.get(
        '/session',
        { preHandler: api.requireSession },
        (_request, reply) => reply.send({ status: 'ok' }),
      );
      done();
    },
    { prefix: '/api/v1' },
  );
  if (startScheduler) {
    const stop = startCleanupScheduler(db, config, app.log);
    app.addHook('onClose', (_instance, done) => {
      stop();
      done();
    });
  }
  return app;
}
