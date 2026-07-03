import { ContactStatus, ContactType, type Prisma } from '@prisma/client';
import type { AuthUser } from '@sitescop/shared-types';
import type {
  ContactDetail,
  ContactRecord,
  ContactsListResponse,
  CreateContactRequest,
  UpdateContactRequest,
} from '@sitescop/shared-types';
import { z } from 'zod';
import { createAuditLog } from '../../shared/audit/audit.service.js';
import { AppError, NotFoundError } from '../../shared/http/errors.js';
import { parsePagination } from '../../shared/http/validation.js';
import { resolveCompanyScope } from '../../shared/scoping/company-scope.js';
import { prisma } from '../../shared/database/prisma.js';

const contactFieldsSchema = z.object({
  type: z.nativeEnum(ContactType),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  companyName: z.string().max(200).optional(),
  abn: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  status: z.nativeEnum(ContactStatus).optional(),
});

function assertClientHasEmail(type: ContactType, email: string | null | undefined): void {
  if (type === ContactType.CLIENT && !email?.trim()) {
    throw new AppError(
      'Client contacts must have an email address so agreements and invoices can be sent.',
      'VALIDATION_ERROR',
    );
  }
}

export const createContactSchema = contactFieldsSchema.superRefine((data, ctx) => {
  if (data.type === ContactType.CLIENT && !data.email?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Email is required for clients — used to send agreements and invoices',
      path: ['email'],
    });
  }
});

export const updateContactSchema = contactFieldsSchema.partial();

function mapContact(contact: ContactRecordSource): ContactRecord {
  return {
    id: contact.id,
    type: contact.type as ContactRecord['type'],
    status: contact.status as ContactRecord['status'],
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    companyName: contact.companyName,
    abn: contact.abn,
    address: contact.address,
    notes: contact.notes,
    displayName: `${contact.firstName} ${contact.lastName}`.trim(),
    jobCount: contact._count?.clientJobs ?? 0,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

type ContactRecordSource = Prisma.ContactGetPayload<{
  include: { _count: { select: { clientJobs: true } } };
}>;

export async function listContacts(
  user: AuthUser,
  query: { page?: string; pageSize?: string; type?: string; search?: string; companyId?: string },
): Promise<ContactsListResponse> {
  const { page, pageSize, skip } = parsePagination(query);
  const companyId = resolveCompanyScope(user, query.companyId);

  const where: Prisma.ContactWhereInput = {
    deletedAt: null,
    ...(companyId ? { companyId } : {}),
  };

  if (query.type) {
    where.type = query.type as ContactType;
  }

  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: 'insensitive' } },
      { lastName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search, mode: 'insensitive' } },
      { companyName: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { _count: { select: { clientJobs: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip,
      take: pageSize,
    }),
    prisma.contact.count({ where }),
  ]);

  return {
    contacts: contacts.map(mapContact),
    total,
    page,
    pageSize,
  };
}

export async function getContact(user: AuthUser, id: string): Promise<ContactDetail> {
  const companyId = resolveCompanyScope(user);
  const contact = await prisma.contact.findFirst({
    where: { id, deletedAt: null, ...(companyId ? { companyId } : {}) },
    include: {
      _count: { select: { clientJobs: true } },
      clientJobs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          jobNumber: true,
          title: true,
          status: true,
          scheduledDate: true,
          createdAt: true,
        },
      },
    },
  });

  if (!contact) throw new NotFoundError('Contact not found');

  return {
    ...mapContact(contact),
    jobs: contact.clientJobs.map((job) => ({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      status: job.status,
      scheduledDate: job.scheduledDate?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
    })),
  };
}

export async function createContact(
  user: AuthUser,
  input: CreateContactRequest,
  request?: import('fastify').FastifyRequest,
): Promise<ContactRecord> {
  const data = createContactSchema.parse(input);
  const companyId = resolveCompanyScope(user) ?? user.companyId;
  if (!companyId) throw new NotFoundError('Company required');

  const contact = await prisma.contact.create({
    data: {
      companyId,
      type: data.type,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone ?? null,
      companyName: data.companyName ?? null,
      abn: data.abn ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
      status: data.status ?? ContactStatus.ACTIVE,
    },
    include: { _count: { select: { clientJobs: true } } },
  });

  await createAuditLog({
    companyId,
    actorId: user.id,
    action: 'contact.created',
    entityType: 'Contact',
    entityId: contact.id,
    request,
  });

  return mapContact(contact);
}

export async function updateContact(
  user: AuthUser,
  id: string,
  input: UpdateContactRequest,
  request?: import('fastify').FastifyRequest,
): Promise<ContactRecord> {
  const data = updateContactSchema.parse(input);
  const companyId = resolveCompanyScope(user);

  const existing = await prisma.contact.findFirst({
    where: { id, deletedAt: null, ...(companyId ? { companyId } : {}) },
  });
  if (!existing) throw new NotFoundError('Contact not found');

  const nextType = data.type ?? existing.type;
  const nextEmail =
    data.email === ''
      ? null
      : data.email !== undefined
        ? data.email
        : existing.email;
  assertClientHasEmail(nextType, nextEmail);

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      type: data.type,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email === '' ? null : data.email,
      phone: data.phone,
      companyName: data.companyName,
      abn: data.abn,
      address: data.address,
      notes: data.notes,
      status: data.status,
    },
    include: { _count: { select: { clientJobs: true } } },
  });

  await createAuditLog({
    companyId: contact.companyId,
    actorId: user.id,
    action: 'contact.updated',
    entityType: 'Contact',
    entityId: contact.id,
    request,
  });

  return mapContact(contact);
}

export async function deleteContact(
  user: AuthUser,
  id: string,
  request?: import('fastify').FastifyRequest,
): Promise<{ success: true }> {
  const companyId = resolveCompanyScope(user);
  const existing = await prisma.contact.findFirst({
    where: { id, deletedAt: null, ...(companyId ? { companyId } : {}) },
  });
  if (!existing) throw new NotFoundError('Contact not found');

  await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date(), status: ContactStatus.INACTIVE },
  });

  await createAuditLog({
    companyId: existing.companyId,
    actorId: user.id,
    action: 'contact.deleted',
    entityType: 'Contact',
    entityId: id,
    request,
  });

  return { success: true };
}
