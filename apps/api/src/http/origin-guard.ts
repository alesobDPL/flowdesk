import type { FastifyInstance } from 'fastify';
import { HttpError } from './errors.js';

export function registerOriginGuard(
  app: FastifyInstance,
  appOrigin: string,
): void {
  const mutations = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  app.addHook('onRequest', (request, _reply, done) => {
    if (!mutations.has(request.method)) return done();
    const mediaType = request.headers['content-type']
      ?.split(';')[0]
      ?.trim()
      .toLowerCase();
    if (
      request.headers.origin !== appOrigin ||
      mediaType !== 'application/json'
    ) {
      throw new HttpError(
        403,
        'FORBIDDEN',
        'A matching Origin and JSON content type are required.',
      );
    }
    done();
  });
}
