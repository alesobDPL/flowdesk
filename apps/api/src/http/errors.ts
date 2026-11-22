import type { ApiErrorBody, ErrorCode } from '@flowdesk/shared';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '../core/requests/errors.js';
import { DemoCapacityError } from '../demo/spaces/space.service.js';

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function errorBody(
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): ApiErrorBody {
  return { error: { code, message, details } };
}

export function registerErrors(app: FastifyInstance): void {
  app.setNotFoundHandler(async (_request, reply) =>
    reply.code(404).send(errorBody('NOT_FOUND', 'Route not found.')),
  );
  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof ZodError) {
      const fields: Record<string, string[]> = {};
      const stableCodes = new Set([
        'too_short',
        'too_long',
        'required',
        'date_in_past',
      ]);
      for (const issue of error.issues) {
        const field = issue.path.map(String).join('.') || '_root';
        const code = stableCodes.has(issue.message)
          ? issue.message
          : issue.code;
        (fields[field] ??= []).push(code);
      }
      return reply
        .code(400)
        .send(errorBody('VALIDATION_ERROR', 'Invalid input.', { fields }));
    }
    if (error instanceof DomainError) {
      const status =
        error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'FORBIDDEN'
            ? 403
            : error.code === 'INVALID_TRANSITION'
              ? 409
              : 422;
      return reply.code(status).send(errorBody(error.code, error.message));
    }
    if (error instanceof DemoCapacityError) {
      return reply
        .code(503)
        .send(
          errorBody(
            'DEMO_AT_CAPACITY',
            'The demo is at capacity. Please try again later.',
          ),
        );
    }
    if (error instanceof HttpError) {
      return reply
        .code(error.statusCode)
        .send(errorBody(error.code, error.message));
    }
    const fastifyCode =
      error instanceof Error && 'code' in error ? error.code : undefined;
    if (fastifyCode === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return reply
        .code(413)
        .send(errorBody('VALIDATION_ERROR', 'Request body is too large.'));
    }
    if (
      fastifyCode === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
      fastifyCode === 'FST_ERR_CTP_EMPTY_JSON_BODY'
    ) {
      return reply
        .code(400)
        .send(errorBody('VALIDATION_ERROR', 'Invalid JSON body.'));
    }
    request.log.error({ err: error }, 'Request failed.');
    return reply.code(500).send(
      errorBody('INTERNAL_ERROR', 'An internal error occurred.', {
        requestId: request.id,
      }),
    );
  });
}
