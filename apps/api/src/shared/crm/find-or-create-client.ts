import { ContactStatus, ContactType } from '@prisma/client';
import { createAuditLog } from '../audit/audit.service.js';
import { prisma } from '../database/prisma.js';
import { stripLeadingHonorifics } from './client-name.js';

export function splitClientName(fullName: string): { firstName: string; lastName: string } {
  const normalized = stripLeadingHonorifics(fullName);
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Client', lastName: '-' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '-' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export async function findOrCreateClientContact(
  companyId: string,
  input: { clientName: string; clientEmail: string; clientPhone?: string },
  actorId?: string,
  request?: import('fastify').FastifyRequest,
): Promise<string> {
  const email = input.clientEmail.toLowerCase().trim();

  const existing = await prisma.contact.findFirst({
    where: {
      companyId,
      type: ContactType.CLIENT,
      deletedAt: null,
      email: { equals: email, mode: 'insensitive' },
    },
  });

  if (existing) {
    if (input.clientPhone?.trim() && !existing.phone) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: { phone: input.clientPhone.trim() },
      });
    }
    return existing.id;
  }

  const { firstName, lastName } = splitClientName(input.clientName);
  const contact = await prisma.contact.create({
    data: {
      companyId,
      type: ContactType.CLIENT,
      firstName,
      lastName,
      email,
      phone: input.clientPhone?.trim() || null,
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
      metadata: { source: 'agreement_send' },
      request,
    });
  }

  return contact.id;
}
