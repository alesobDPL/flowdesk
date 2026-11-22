import { createSpaceSchema } from '@flowdesk/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../../config.js';
import type { SessionService } from '../../demo/session/session.service.js';
import type { DemoSpaceService } from '../../demo/spaces/space.service.js';
import { HttpError } from '../errors.js';

export function registerDemo(
  app: FastifyInstance,
  spaces: DemoSpaceService,
  sessions: SessionService,
  config: Config,
  clock: () => Date,
): void {
  // One limiter instance gives both routes a single store. Per-route plugin
  // config creates independent stores, even when their key prefixes match.
  const limit = app.createRateLimit({
    max: config.demo.spacesPerIpHour,
    timeWindow: 3_600_000,
    keyGenerator: (request) => `demo-spaces:${request.ip}`,
  });
  const limitSpaces = async (request: FastifyRequest): Promise<void> => {
    const result = await limit(request);
    if (!result.isAllowed && result.isExceeded) {
      throw new HttpError(
        429,
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
      );
    }
  };

  async function created(
    reply: FastifyReply,
    result: { token: string; hardExpiresAt: Date },
  ) {
    const resolved = await sessions.resolve(result.token);
    if (resolved.status !== 'ok')
      throw new Error('Created demo session could not be resolved.');
    const info = await sessions.info(resolved.session);
    return reply
      .setCookie('fd_session', result.token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: config.nodeEnv === 'production',
        maxAge: Math.max(
          0,
          Math.floor(
            (result.hardExpiresAt.getTime() - clock().getTime()) / 1000,
          ),
        ),
      })
      .code(201)
      .send(info);
  }

  app.post('/demo/spaces', {}, async (request, reply) => {
    const { locale } = createSpaceSchema.parse(request.body);
    const resolved = await sessions.resolve(request.cookies.fd_session);
    if (resolved.status === 'ok') {
      await sessions.touch(resolved.session);
      return sessions.info(resolved.session);
    }
    await limitSpaces(request);
    return created(reply, await spaces.create(locale));
  });
  app.post(
    '/demo/spaces/reset',
    { onRequest: limitSpaces, preHandler: app.requireSession },
    async (request, reply) => {
      const { locale } = createSpaceSchema.parse(request.body);
      return created(reply, await spaces.reset(request.demoSession!, locale));
    },
  );
}
