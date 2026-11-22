import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from '../config.js';
import { RequestService } from '../core/requests/service.js';
import type { Db } from '../db/client.js';
import { startCleanupScheduler } from '../demo/cleanup/cleanup.js';
import { createDemoScopeHooks } from '../demo/limits/scope-hooks.js';
import { SessionService } from '../demo/session/session.service.js';
import { hashToken } from '../demo/session/token.js';
import { DemoSpaceService } from '../demo/spaces/space.service.js';
import { HttpError, registerErrors } from './errors.js';
import { serializeRequest } from './logging.js';
import { registerOriginGuard } from './origin-guard.js';
import { registerHealth } from './routes/health.js';
import { registerDemo } from './routes/demo.js';
import { registerRequests } from './routes/requests.js';
import { registerSession } from './routes/session.js';
import { registerTour } from './routes/tour.js';
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
  const limitIp = app.createRateLimit({
    max: config.demo.ipRateLimitPerMin,
    timeWindow: 60_000,
    keyGenerator: (request) => `ip:${request.ip}`,
  });
  // An application hook also counts unknown routes and runs before any session
  // lookup, so rotating made-up cookies cannot bypass the per-IP budget.
  app.addHook('onRequest', async (request) => {
    const result = await limitIp(request);
    if (!result.isAllowed && result.isExceeded) {
      throw new HttpError(
        429,
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
      );
    }
  });
  registerOriginGuard(app, config.appOrigin);
  const sessions = new SessionService(db, config, clock);
  registerSessionPlugin(app, sessions);
  const spaces = new DemoSpaceService(db, config, clock);
  const requests = new RequestService(db, createDemoScopeHooks(config));
  // Leave booting to inject/listen so tests can register additional routes.
  void app.register(
    (api, _options, done) => {
      registerHealth(api, db);
      registerDemo(api, spaces, sessions, config, clock);
      registerSession(api, sessions);
      registerRequests(api, requests, clock);
      registerTour(api, db);
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
