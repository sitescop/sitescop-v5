import { NotificationType, UserRole, UserStatus } from '@prisma/client';
import type { NotificationItem, NotificationsListResponse } from '@sitescop/shared-types';
import { prisma } from '../../shared/database/prisma.js';
import { NotFoundError } from '../../shared/http/errors.js';
import { parsePagination } from '../../shared/http/validation.js';
import type { AuthUser } from '@sitescop/shared-types';

const OFFICE_ROLES: UserRole[] = [
  UserRole.COMPANY_ADMIN,
  UserRole.OFFICE_MANAGER,
  UserRole.OFFICE_STAFF,
];

const BILLING_ROLES: UserRole[] = [...OFFICE_ROLES, UserRole.ACCOUNTANT];

function mapNotification(row: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationItem {
  return {
    id: row.id,
    type: row.type as NotificationItem['type'],
    title: row.title,
    body: row.body,
    entityType: row.entityType,
    entityId: row.entityId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface CreateNotificationInput {
  companyId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await prisma.notification.create({
    data: {
      companyId: input.companyId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });
}

export async function notifyUsers(
  companyId: string,
  userIds: string[],
  input: Omit<CreateNotificationInput, 'companyId' | 'userId'>,
): Promise<void> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return;

  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      companyId,
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
    })),
  });
}

async function findActiveUsersByRoles(companyId: string, roles: UserRole[]): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { companyId, role: { in: roles }, status: UserStatus.ACTIVE },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

export async function notifyOfficeStaff(
  companyId: string,
  input: Omit<CreateNotificationInput, 'companyId' | 'userId'>,
): Promise<void> {
  const userIds = await findActiveUsersByRoles(companyId, OFFICE_ROLES);
  await notifyUsers(companyId, userIds, input);
}

export async function notifyBillingTeam(
  companyId: string,
  input: Omit<CreateNotificationInput, 'companyId' | 'userId'>,
): Promise<void> {
  const userIds = await findActiveUsersByRoles(companyId, BILLING_ROLES);
  await notifyUsers(companyId, userIds, input);
}

export async function listNotifications(
  user: AuthUser,
  query: Record<string, string | undefined>,
): Promise<NotificationsListResponse> {
  const { page, pageSize, skip } = parsePagination(query);
  const unreadOnly = query.unread === 'true';

  const where = {
    userId: user.id,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [rows, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return {
    notifications: rows.map(mapNotification),
    total,
    unreadCount,
    page,
    pageSize,
  };
}

export async function getUnreadCount(user: AuthUser): Promise<number> {
  return prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });
}

export async function markNotificationRead(user: AuthUser, id: string): Promise<NotificationItem> {
  const row = await prisma.notification.findFirst({
    where: { id, userId: user.id },
  });
  if (!row) throw new NotFoundError('Notification not found');

  const updated = row.readAt
    ? row
    : await prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });

  return mapNotification(updated);
}

export async function markAllNotificationsRead(user: AuthUser): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
