import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './errors.js';
import { formatZodError } from './validation.js';

export function handleRouteError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
  fallbackMessage = 'Request failed',
): ReturnType<FastifyReply['send']> {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: formatZodError(error),
    });
  }
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message, code: error.code });
  }
  request.log.error(error);
  return reply.status(500).send({ error: fallbackMessage, code: 'INTERNAL_ERROR' });
}
