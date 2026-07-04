import { ContactStatus, ContactType } from '@prisma/client';
import { createAuditLog } from '../audit/audit.service.js';
import { prisma } from '../database/prisma.js';
import { splitClientName } from './find-or-create-client.js';

export async function findOrCreateManualClientContact(
  companyId: string,
  input: { clientName: string; clientEmail?: string; clientPhone: string },
  actorId?: string,
  request?: import('fastify').FastifyRequest,
): Promise<string> {
  const phone = input.clientPhone.trim();
  const email = input.clientEmail?.trim().toLowerCase();

  if (email) {
    const byEmail = await prisma.contact.findFirst({
      where: {
        companyId,
        type: ContactType.CLIENT,
        deletedAt: null,
        email: { equals: email, mode: 'insensitive' },
      },
    });
    if (byEmail) {
      if (phone && !byEmail.phone) {
        await prisma.contact.update({ where: { id: byEmail.id }, data: { phone } });
      }
      return byEmail.id;
    }
  }

  const byPhone = await prisma.contact.findFirst({
    where: {
      companyId,
      type: ContactType.CLIENT,
      deletedAt: null,
      phone,
    },
  });
  if (byPhone) {
    if (email && !byPhone.email) {
      await prisma.contact.update({ where: { id: byPhone.id }, data: { email } });
    }
    return byPhone.id;
  }

  const { firstName, lastName } = splitClientName(input.clientName);
  const contact = await prisma.contact.create({
    data: {
      companyId,
      type: ContactType.CLIENT,
      firstName,
      lastName,
      email: email ?? null,
      phone,
      status: ContactStatus.ACTIVE,
    },
  });

  if (actorId) {
    await createAuditLog({
      companyId,
      actorId,
      action: 'contact.created',
      entityType: 'Contact',
      entityId: contact.id,
      metadata: { source: 'manual_job' },
      request,
    });
  }

  return contact.id;
}
