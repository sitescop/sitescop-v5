import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { config } from '../../config.js';
import { authenticateRequest, requireAuth } from '../../shared/auth/middleware.js';
import {
  AuthError,
  forgotPasswordSchema,
  loginSchema,
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  resetPasswordSchema,
} from './auth.service.js';
import { getPermissionsForRole } from '@sitescop/shared-types';

function formatZodError(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    details[key] = details[key] ?? [];
    details[key].push(issue.message);
  }
  return details;
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict' as const,
    path: '/',
  };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const { user, sessionToken } = await loginUser(body.email, body.password, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      reply.setCookie(config.session.cookieName, sessionToken, {
        ...sessionCookieOptions(),
        maxAge: config.session.maxAgeMs / 1000,
      });

      return reply.send({ user });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: formatZodError(error),
        });
      }
      if (error instanceof AuthError) {
        return reply.status(401).send({ error: error.message, code: error.code });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Login failed', code: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/v1/auth/logout', { preHandler: requireAuth() }, async (request, reply) => {
    const token = request.sessionToken ?? request.cookies[config.session.cookieName];
    if (token) {
      await logoutUser(token, request.authUser?.id);
    }
    reply.clearCookie(config.session.cookieName, sessionCookieOptions());
    return reply.send({ success: true });
  });

  app.get('/api/v1/auth/me', { preHandler: requireAuth() }, async (request, reply) => {
    const user = request.authUser!;
    return reply.send({
      user,
      permissions: getPermissionsForRole(user.role),
    });
  });

  app.post('/api/v1/auth/forgot-password', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    try {
      const body = forgotPasswordSchema.parse(request.body);
      const result = await requestPasswordReset(body.email);

      const response: Record<string, unknown> = {
        message: 'If an account exists for that email, a reset link has been sent.',
      };

      if (!config.isProduction && result.resetToken) {
        response.devResetUrl = `${config.webAppUrl}/reset-password?token=${result.resetToken}`;
      }

      return reply.send(response);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: formatZodError(error),
        });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Request failed', code: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/v1/auth/reset-password', {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    try {
      const body = resetPasswordSchema.parse(request.body);
      await resetPassword(body.token, body.password);
      return reply.send({ message: 'Password updated successfully. You can now sign in.' });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: formatZodError(error),
        });
      }
      if (error instanceof AuthError) {
        return reply.status(400).send({ error: error.message, code: error.code });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Reset failed', code: 'INTERNAL_ERROR' });
    }
  });

  app.get('/api/v1/auth/session', async (request, reply) => {
    const user = await authenticateRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated', code: 'UNAUTHORIZED' });
    }
    return reply.send({
      user,
      permissions: getPermissionsForRole(user.role),
    });
  });
}
