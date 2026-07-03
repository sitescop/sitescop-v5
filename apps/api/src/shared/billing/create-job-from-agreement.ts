import { JobStatus } from '@prisma/client';
import { JOB_TYPE_LABELS, JobType } from '@sitescop/shared-types';
import { NotFoundError } from '../http/errors.js';
import { generateJobNumber } from '../mappers/index.js';
import { prisma } from '../database/prisma.js';

export const PENDING_PROPERTY_PLACEHOLDER = 'To be confirmed by client at signing';

function propertyFieldsFromAddress(address: string): {
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
} {
  const trimmed = address.trim();
  if (!trimmed || trimmed === PENDING_PROPERTY_PLACEHOLDER) {
    return {
      addressLine1: 'Address pending confirmation',
      suburb: 'TBC',
      state: 'NSW',
      postcode: '0000',
    };
  }

  return {
    addressLine1: trimmed,
    suburb: 'See agreement',
    state: 'NSW',
    postcode: '0000',
  };
}

export async function createJobFromAgreement(
  agreementId: string,
  companyId: string,
  createdById: string,
): Promise<string> {
  const agreement = await prisma.agreement.findFirst({
    where: { id: agreementId, companyId },
  });
  if (!agreement) throw new NotFoundError('Agreement not found');
  if (agreement.jobId) return agreement.jobId;

  const jobNumber = await generateJobNumber(companyId);
  const propertyData = propertyFieldsFromAddress(agreement.propertyAddress);
  const typeLabel = JOB_TYPE_LABELS[agreement.type as JobType] ?? 'Inspection';

  const job = await prisma.$transaction(async (tx) => {
    const property = await tx.property.create({
      data: { companyId, ...propertyData },
    });

    const created = await tx.job.create({
      data: {
        companyId,
        jobNumber,
        title: `${typeLabel} — ${propertyData.addressLine1}`,
        type: agreement.type,
        status: JobStatus.PENDING_ASSIGNMENT,
        propertyId: property.id,
        clientContactId: agreement.clientContactId,
        priceCents: agreement.priceCents,
        createdById,
      },
    });

    await tx.agreement.update({
      where: { id: agreementId },
      data: { jobId: created.id },
    });

    await tx.invoice.updateMany({
      where: { agreementId, companyId },
      data: { jobId: created.id },
    });

    return created;
  });

  return job.id;
}
