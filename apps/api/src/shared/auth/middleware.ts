import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../../config.js';
import { prisma } from '../database/prisma.js';
import { hashToken } from '../auth/crypto.js';
import { mapUserToAuthUser } from '../auth/user-mapper.js';
import type { AuthUser } from '@sitescop/shared-types';
import type { Permission } from '@sitescop/shared-types';
import { roleHasPermission } from '../permissions/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
    sessionToken?: string;
  }
}

export async function authenticateRequest(request: FastifyRequest): Promise<AuthUser | null> {
  const rawToken = request.cookies[config.session.cookieName];
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const session = await prisma.userSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: { company: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  if (session.user.status !== 'ACTIVE') {
    return null;
  }

  const authUser = mapUserToAuthUser(session.user);
  request.authUser = authUser;
  request.sessionToken = rawToken;
  return authUser;
}

export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticateRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }
  };
}

export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.authUser ?? (await authenticateRequest(request));
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }
    if (!roleHasPermission(user.role, permission)) {
      return reply.status(403).send({ error: 'Permission denied', code: 'FORBIDDEN' });
    }
    request.authUser = user;
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.authUser ?? (await authenticateRequest(request));
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }
    const allowed = permissions.some((permission) => roleHasPermission(user.role, permission));
    if (!allowed) {
      return reply.status(403).send({ error: 'Permission denied', code: 'FORBIDDEN' });
    }
    request.authUser = user;
  };
}
