import { AgreementStatus, InvoiceStatus, JobStatus } from '@prisma/client';
import type { JobBillingStatus } from '@sitescop/shared-types';
import { AgreementStatus as SharedAgreementStatus, InvoiceStatus as SharedInvoiceStatus } from '@sitescop/shared-types';
import { AppError } from '../http/errors.js';
import { prisma } from '../database/prisma.js';

export async function getJobBillingStatus(jobId: string, companyId: string): Promise<JobBillingStatus> {
  const [signedAgreement, paidInvoice, pendingInvoice, activeAgreement, activeInvoice] = await Promise.all([
    prisma.agreement.findFirst({
      where: { jobId, companyId, status: AgreementStatus.SIGNED },
      orderBy: { signedAt: 'desc' },
      select: { id: true, agreementNumber: true, status: true },
    }),
    prisma.invoice.findFirst({
      where: { jobId, companyId, status: InvoiceStatus.PAID },
      orderBy: { paidAt: 'desc' },
      select: { id: true, invoiceNumber: true, status: true },
    }),
    prisma.invoice.findFirst({
      where: {
        jobId,
        companyId,
        status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, invoiceNumber: true },
    }),
    prisma.agreement.findFirst({
      where: {
        jobId,
        companyId,
        status: { notIn: [AgreementStatus.CANCELLED, AgreementStatus.DECLINED] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, agreementNumber: true, status: true },
    }),
    prisma.invoice.findFirst({
      where: {
        jobId,
        companyId,
        status: { notIn: [InvoiceStatus.VOID] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, invoiceNumber: true, status: true },
    }),
  ]);

  const agreementSigned = Boolean(signedAgreement);
  const invoicePaid = Boolean(paidInvoice);

  return {
    agreementSigned,
    invoicePaid,
    readyForInspection: agreementSigned && invoicePaid,
    signedAgreementId: signedAgreement?.id ?? null,
    signedAgreementNumber: signedAgreement?.agreementNumber ?? null,
    paidInvoiceId: paidInvoice?.id ?? null,
    paidInvoiceNumber: paidInvoice?.invoiceNumber ?? null,
    pendingInvoiceId: pendingInvoice?.id ?? null,
    pendingInvoiceNumber: pendingInvoice?.invoiceNumber ?? null,
    activeAgreement: activeAgreement
      ? {
          id: activeAgreement.id,
          agreementNumber: activeAgreement.agreementNumber,
          status: activeAgreement.status as SharedAgreementStatus,
        }
      : null,
    activeInvoice: activeInvoice
      ? {
          id: activeInvoice.id,
          invoiceNumber: activeInvoice.invoiceNumber,
          status: activeInvoice.status as SharedInvoiceStatus,
        }
      : null,
  };
}

export async function assertJobReadyForInspection(jobId: string, companyId: string): Promise<void> {
  const billing = await getJobBillingStatus(jobId, companyId);
  if (!billing.readyForInspection) {
    const missing: string[] = [];
    if (!billing.agreementSigned) missing.push('a signed client agreement');
    if (!billing.invoicePaid) missing.push('payment received on the invoice');
    throw new AppError(
      `Job is not ready for inspection. Required: ${missing.join(' and ')}.`,
      'BILLING_NOT_READY',
    );
  }
}

export async function advanceJobAfterBillingComplete(jobId: string, companyId: string): Promise<void> {
  const billing = await getJobBillingStatus(jobId, companyId);
  if (!billing.readyForInspection) return;

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId },
    select: { status: true },
  });
  if (!job || job.status !== JobStatus.DRAFT) return;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: JobStatus.PENDING_ASSIGNMENT },
  });
}
