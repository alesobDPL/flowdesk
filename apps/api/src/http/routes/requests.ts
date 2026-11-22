import {
  APP_TIME_ZONE,
  approveSchema,
  buildCreateRequestSchema,
  completeSchema,
  listQuerySchema,
  rejectSchema,
  releaseSchema,
  todayIn,
} from '@flowdesk/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DomainError } from '../../core/requests/errors.js';
import type { RequestService } from '../../core/requests/service.js';

const uuid = z.uuid();
const cursorParts = z.tuple([z.iso.datetime({ offset: true }), uuid]);
const cursorSchema = z.string().refine(
  (value) => {
    // Buffer decoding is deliberately permissive; require canonical base64url
    // as well as a valid timestamp and UUID before passing the cursor to SQL.
    if (!/^[A-Za-z0-9_-]+$/.test(value)) return false;
    const decoded = Buffer.from(value, 'base64url');
    if (decoded.toString('base64url') !== value) return false;
    return cursorParts.safeParse(decoded.toString('utf8').split('|')).success;
  },
  { message: 'Invalid cursor.' },
);
const validatedCursor = z.object({ cursor: cursorSchema });
const emptyBody = z.object({});

function requestId(params: unknown): string {
  const result = z.object({ id: uuid }).safeParse(params);
  if (!result.success) throw new DomainError('NOT_FOUND', 'Request not found.');
  return result.data.id;
}

export function registerRequests(
  app: FastifyInstance,
  requests: RequestService,
  clock: () => Date,
): void {
  const protectedRoute = { preHandler: app.requireSession };
  app.get('/requests', protectedRoute, (request) => {
    const query = listQuerySchema.parse(request.query);
    if (query.cursor !== undefined)
      validatedCursor.parse({ cursor: query.cursor });
    return requests.list(request.demoSession!.actor, query);
  });
  app.post('/requests', protectedRoute, async (request, reply) => {
    const input = buildCreateRequestSchema(
      todayIn(APP_TIME_ZONE, clock()),
    ).parse(request.body);
    return reply
      .code(201)
      .send(await requests.create(request.demoSession!.actor, input));
  });
  app.get('/requests/:id', protectedRoute, (request) =>
    requests.get(request.demoSession!.actor, requestId(request.params)),
  );
  app.post('/requests/:id/approve', protectedRoute, (request) => {
    const id = requestId(request.params);
    return requests.approve(
      request.demoSession!.actor,
      id,
      approveSchema.parse(request.body),
    );
  });
  app.post('/requests/:id/reject', protectedRoute, (request) => {
    const id = requestId(request.params);
    return requests.reject(
      request.demoSession!.actor,
      id,
      rejectSchema.parse(request.body),
    );
  });
  app.post('/requests/:id/assign', protectedRoute, (request) => {
    const id = requestId(request.params);
    emptyBody.parse(request.body);
    return requests.assign(request.demoSession!.actor, id);
  });
  app.post('/requests/:id/release', protectedRoute, (request) => {
    const id = requestId(request.params);
    return requests.release(
      request.demoSession!.actor,
      id,
      releaseSchema.parse(request.body),
    );
  });
  app.post('/requests/:id/complete', protectedRoute, (request) => {
    const id = requestId(request.params);
    return requests.complete(
      request.demoSession!.actor,
      id,
      completeSchema.parse(request.body),
    );
  });
}
