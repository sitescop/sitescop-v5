import type { Contact, Job, Property, User } from '@prisma/client';
import type { ContactSummary, PropertySummary, UserSummary } from '@sitescop/shared-types';

export function formatPropertyAddress(property: Property): string {
  const parts = [
    property.addressLine1,
    property.addressLine2,
    `${property.suburb} ${property.state} ${property.postcode}`,
  ].filter(Boolean);
  return parts.join(', ');
}

export function mapProperty(property: Property): PropertySummary {
  return {
    id: property.id,
    addressLine1: property.addressLine1,
    addressLine2: property.addressLine2,
    suburb: property.suburb,
    state: property.state,
    postcode: property.postcode,
    formattedAddress: formatPropertyAddress(property),
  };
}

export function mapUserSummary(user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>): UserSummary {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    displayName: `${user.firstName} ${user.lastName}`.trim(),
  };
}

export function mapContactSummary(contact: Contact): ContactSummary {
  return {
    id: contact.id,
    type: contact.type,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    displayName: `${contact.firstName} ${contact.lastName}`.trim(),
  };
}

import { prisma } from '../database/prisma.js';

export async function generateJobNumber(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `JOB-${year}-`;
  const latest = await prisma.job.findFirst({
    where: { companyId, jobNumber: { startsWith: prefix } },
    orderBy: { jobNumber: 'desc' },
    select: { jobNumber: true },
  });

  const nextSeq = latest ? Number.parseInt(latest.jobNumber.split('-').pop() ?? '0', 10) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

export function canInspectorAccessJob(
  job: Pick<Job, 'assignedInspectorId'>,
  userId: string,
  hasViewAll: boolean,
): boolean {
  return hasViewAll || job.assignedInspectorId === userId;
}
