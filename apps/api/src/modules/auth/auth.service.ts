import { z } from 'zod';
import { prisma } from '../../shared/database/prisma.js';
import {
  generateSecureToken,
  getSessionExpiry,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../../shared/auth/crypto.js';
import { mapUserToAuthUser } from '../../shared/auth/user-mapper.js';
import { config } from '../../config.js';
import type { AuthUser } from '@sitescop/shared-types';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function loginUser(
  email: string,
  password: string,
  meta: { ipAddress?: string; userAgent?: string },
): Promise<{ user: AuthUser; sessionToken: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { company: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const sessionToken = generateSecureToken();
  const tokenHash = hashToken(sessionToken);

  await prisma.$transaction([
    prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: getSessionExpiry(config.session.maxAgeMs),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        actorId: user.id,
        action: 'auth.login',
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta.ipAddress,
      },
    }),
  ]);

  return {
    user: mapUserToAuthUser(user),
    sessionToken,
  };
}

export async function logoutUser(sessionToken: string, actorId?: string): Promise<void> {
  const tokenHash = hashToken(sessionToken);
  const session = await prisma.userSession.findUnique({ where: { tokenHash } });

  if (session) {
    await prisma.$transaction([
      prisma.userSession.delete({ where: { id: session.id } }),
      prisma.auditLog.create({
        data: {
          actorId: actorId ?? session.userId,
          action: 'auth.logout',
          entityType: 'UserSession',
          entityId: session.id,
        },
      }),
    ]);
  }
}

export async function requestPasswordReset(email: string): Promise<{ resetToken?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || user.status !== 'ACTIVE') {
    return {};
  }

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const resetToken = generateSecureToken();
  const tokenHash = hashToken(resetToken);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + config.passwordReset.expiryMs),
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actorId: user.id,
      action: 'auth.password_reset_requested',
      entityType: 'User',
      entityId: user.id,
    },
  });

  return { resetToken };
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    throw new AuthError('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
    prisma.userSession.deleteMany({ where: { userId: resetRecord.userId } }),
    prisma.auditLog.create({
      data: {
        companyId: resetRecord.user.companyId,
        actorId: resetRecord.userId,
        action: 'auth.password_reset_completed',
        entityType: 'User',
        entityId: resetRecord.userId,
      },
    }),
  ]);
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
  return user ? mapUserToAuthUser(user) : null;
}
