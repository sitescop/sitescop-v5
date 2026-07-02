import { UserRole, UserStatus, type Prisma } from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import type {
  AdminCompaniesListResponse,
  AdminCompanyRecord,
  AdminUserRecord,
  AdminUsersListResponse,
  AuditLogsListResponse,
  CreateCompanyRequest,
  CreateUserRequest,
  UpdateCompanyRequest,
  UpdateUserRequest,
} from '@sitescop/shared-types';
import { UserRole as SharedUserRole, UserStatus as SharedUserStatus } from '@sitescop/shared-types';
import { z } from 'zod';
import { createAuditLog } from '../../shared/audit/audit.service.js';
import { hashPassword } from '../../shared/auth/crypto.js';
import { mapUserToAuthUser } from '../../shared/auth/user-mapper.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/http/errors.js';
import { parsePagination } from '../../shared/http/validation.js';
import { assertSuperAdmin, resolveCompanyScope } from '../../shared/scoping/company-scope.js';
import { prisma } from '../../shared/database/prisma.js';

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8).optional(),
  companyId: z.string().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  password: z.string().min(8).optional(),
});

const companySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  abn: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
});

function mapAdminUser(
  user: Prisma.UserGetPayload<{ include: { company: true } }>,
): AdminUserRecord {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as AdminUserRecord['role'],
    status: user.status as AdminUserRecord['status'],
    companyId: user.companyId,
    companyName: user.company?.name ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function assertCanManageUser(actor: AuthUser, targetCompanyId: string | null): void {
  if (actor.role === SharedUserRole.SUPER_ADMIN) return;
  if (actor.companyId !== targetCompanyId) {
    throw new ForbiddenError('Cannot manage users outside your company');
  }
}

export async function listUsers(
  user: AuthUser,
  query: { page?: string; pageSize?: string; search?: string; role?: string; companyId?: string },
): Promise<AdminUsersListResponse> {
  const { page, pageSize, skip } = parsePagination(query);
  const companyId = resolveCompanyScope(user, query.companyId);

  const where: Prisma.UserWhereInput = {
    ...(companyId ? { companyId } : {}),
  };

  if (query.role) {
    where.role = query.role as UserRole;
  }

  if (query.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { company: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(mapAdminUser),
    total,
    page,
    pageSize,
  };
}

export async function createUser(
  actor: AuthUser,
  input: CreateUserRequest,
  request?: import('fastify').FastifyRequest,
): Promise<AdminUserRecord> {
  const data = createUserSchema.parse(input);
  const companyId =
    actor.role === SharedUserRole.SUPER_ADMIN ? data.companyId ?? actor.companyId : actor.companyId;

  if (!companyId && data.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Company is required for this user role');
  }

  assertCanManageUser(actor, companyId ?? null);

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new ConflictError('Email already in use');

  const password = data.password ?? 'SiteScop2026!';
  const passwordHash = await hashPassword(password);

  const created = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      status: data.password ? UserStatus.ACTIVE : UserStatus.INVITED,
      passwordHash,
      companyId: data.role === UserRole.SUPER_ADMIN ? null : companyId,
    },
    include: { company: true },
  });

  await createAuditLog({
    companyId,
    actorId: actor.id,
    action: 'user.created',
    entityType: 'User',
    entityId: created.id,
    request,
  });

  return mapAdminUser(created);
}

export async function updateUser(
  actor: AuthUser,
  id: string,
  input: UpdateUserRequest,
  request?: import('fastify').FastifyRequest,
): Promise<AdminUserRecord> {
  const data = updateUserSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { id }, include: { company: true } });
  if (!existing) throw new NotFoundError('User not found');

  assertCanManageUser(actor, existing.companyId);

  const updateData: Prisma.UserUpdateInput = {
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role,
    status: data.status,
  };

  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
    updateData.status = UserStatus.ACTIVE;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    include: { company: true },
  });

  await createAuditLog({
    companyId: existing.companyId,
    actorId: actor.id,
    action: 'user.updated',
    entityType: 'User',
    entityId: id,
    request,
  });

  return mapAdminUser(updated);
}

export async function deactivateUser(
  actor: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<AdminUserRecord> {
  if (actor.id === id) throw new ForbiddenError('Cannot deactivate your own account');

  return updateUser(actor, id, { status: SharedUserStatus.DEACTIVATED }, request);
}

export async function listAuditLogs(
  user: AuthUser,
  query: {
    page?: string;
    pageSize?: string;
    action?: string;
    entityType?: string;
    companyId?: string;
  },
): Promise<AuditLogsListResponse> {
  const { page, pageSize, skip } = parsePagination(query);
  const companyId = resolveCompanyScope(user, query.companyId);

  const where: Prisma.AuditLogWhereInput = {
    ...(companyId ? { companyId } : {}),
  };

  if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
  if (query.entityType) where.entityType = query.entityType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: true,
        company: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: (log.metadata as Record<string, unknown>) ?? null,
      actorName: log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : null,
      companyName: log.company?.name ?? null,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

export async function listCompanies(user: AuthUser): Promise<AdminCompaniesListResponse> {
  assertSuperAdmin(user);

  const companies = await prisma.company.findMany({
    include: {
      _count: { select: { users: true, jobs: true } },
    },
    orderBy: { name: 'asc' },
  });

  return {
    companies: companies.map(
      (c): AdminCompanyRecord => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        abn: c.abn,
        email: c.email,
        phone: c.phone,
        userCount: c._count.users,
        jobCount: c._count.jobs,
        createdAt: c.createdAt.toISOString(),
      }),
    ),
    total: companies.length,
  };
}

export async function createCompany(
  user: AuthUser,
  input: CreateCompanyRequest,
  request?: import('fastify').FastifyRequest,
): Promise<AdminCompanyRecord> {
  assertSuperAdmin(user);
  const data = companySchema.parse(input);

  const existing = await prisma.company.findUnique({ where: { slug: data.slug } });
  if (existing) throw new ConflictError('Company slug already exists');

  const company = await prisma.$transaction(async (tx) => {
    const created = await tx.company.create({
      data: {
        name: data.name,
        slug: data.slug,
        abn: data.abn,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });
    await tx.companySettings.create({ data: { companyId: created.id } });
    return created;
  });

  await createAuditLog({
    companyId: company.id,
    actorId: user.id,
    action: 'company.created',
    entityType: 'Company',
    entityId: company.id,
    request,
  });

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    abn: company.abn,
    email: company.email,
    phone: company.phone,
    userCount: 0,
    jobCount: 0,
    createdAt: company.createdAt.toISOString(),
  };
}

export async function updateCompany(
  user: AuthUser,
  id: string,
  input: UpdateCompanyRequest,
  request?: import('fastify').FastifyRequest,
): Promise<AdminCompanyRecord> {
  assertSuperAdmin(user);
  const data = companySchema.partial().parse(input);

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      abn: data.abn,
      email: data.email === '' ? null : data.email,
      phone: data.phone,
      address: data.address,
    },
    include: { _count: { select: { users: true, jobs: true } } },
  });

  await createAuditLog({
    companyId: company.id,
    actorId: user.id,
    action: 'company.updated',
    entityType: 'Company',
    entityId: company.id,
    request,
  });

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    abn: company.abn,
    email: company.email,
    phone: company.phone,
    userCount: company._count.users,
    jobCount: company._count.jobs,
    createdAt: company.createdAt.toISOString(),
  };
}

export async function getAdminOverview(user: AuthUser) {
  const companyId = resolveCompanyScope(user);
  const where = companyId ? { companyId } : {};

  const [userCount, jobCount, contactCount, recentLogs] = await Promise.all([
    prisma.user.count({ where: companyId ? { companyId } : {} }),
    prisma.job.count({ where: { ...where, deletedAt: null } }),
    prisma.contact.count({ where: { ...where, deletedAt: null } }),
    prisma.auditLog.findMany({
      where: companyId ? { companyId } : {},
      include: { actor: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    stats: {
      users: userCount,
      jobs: jobCount,
      contacts: contactCount,
    },
    recentActivity: recentLogs.map((log) => ({
      id: log.id,
      action: log.action,
      actorName: log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System',
      createdAt: log.createdAt.toISOString(),
    })),
  };
}

export { mapUserToAuthUser };
