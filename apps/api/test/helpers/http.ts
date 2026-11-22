import type { Locale } from '@flowdesk/shared';
import type {
  FastifyInstance,
  InjectOptions,
  LightMyRequestResponse,
} from 'fastify';

// The creation route and its cookie attributes are implemented by Task 9.
export async function newVisitor(
  app: FastifyInstance,
  locale: Locale = 'es',
): Promise<{
  cookie: string;
  inject: (opts: InjectOptions) => Promise<LightMyRequestResponse>;
}> {
  const defaults = {
    origin: app.config.appOrigin,
    'content-type': 'application/json',
  };
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/demo/spaces',
    headers: defaults,
    payload: { locale },
  });
  if (response.statusCode !== 201 && response.statusCode !== 200)
    throw new Error(`Visitor creation failed: ${response.statusCode}`);
  const sessionCookie = response.cookies.find(
    (entry) => entry.name === 'fd_session',
  );
  if (!sessionCookie)
    throw new Error('Visitor creation did not set fd_session.');
  const cookie = `fd_session=${encodeURIComponent(sessionCookie.value)}`;
  return {
    cookie,
    inject: async (opts) => {
      const method = opts.method?.toUpperCase();
      return app.inject({
        ...opts,
        ...((method === 'POST' || method === 'PUT') &&
        opts.payload === undefined &&
        opts.body === undefined
          ? { payload: {} }
          : {}),
        headers: { ...defaults, cookie, ...opts.headers },
      });
    },
  };
}
