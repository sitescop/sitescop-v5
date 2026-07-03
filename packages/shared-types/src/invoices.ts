import { JobType } from './jobs.js';
import type { AgreementStatus } from './agreements.js';

export interface JobWorkflowAgreementRef {
  id: string;
  agreementNumber: string;
  status: AgreementStatus;
}

export interface JobWorkflowInvoiceRef {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.DRAFT]: 'Draft',
  [InvoiceStatus.SENT]: 'Sent',
  [InvoiceStatus.PAID]: 'Paid',
  [InvoiceStatus.OVERDUE]: 'Overdue',
  [InvoiceStatus.VOID]: 'Void',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
  [PaymentMethod.CARD]: 'Card',
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.CHEQUE]: 'Cheque',
  [PaymentMethod.OTHER]: 'Other',
};

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientName: string;
  clientEmail: string;
  propertyAddress: string | null;
  description: string;
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  jobId: string | null;
  jobNumber: string | null;
  agreementId: string | null;
  agreementNumber: string | null;
  issueDate: string;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDetail extends InvoiceSummary {
  clientContactId: string | null;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  notes: string | null;
  createdByName: string;
}

export interface InvoicesListResponse {
  invoices: InvoiceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateInvoiceRequest {
  jobId?: string;
  agreementId?: string;
  clientContactId?: string;
  clientName: string;
  clientEmail: string;
  propertyAddress?: string;
  description: string;
  subtotalCents: number;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {}

export interface MarkInvoicePaidRequest {
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  paidAt?: string;
}

export interface SendInvoiceResponse {
  invoice: InvoiceDetail;
  emailSent: boolean;
}

export interface JobBillingStatus {
  agreementSigned: boolean;
  invoicePaid: boolean;
  readyForInspection: boolean;
  signedAgreementId: string | null;
  signedAgreementNumber: string | null;
  paidInvoiceId: string | null;
  paidInvoiceNumber: string | null;
  pendingInvoiceId: string | null;
  pendingInvoiceNumber: string | null;
  activeAgreement: JobWorkflowAgreementRef | null;
  activeInvoice: JobWorkflowInvoiceRef | null;
}

export interface SendJobAgreementResponse {
  agreementId: string;
  agreementNumber: string;
  emailSent: boolean;
  signingUrl?: string;
}

export function formatAudCents(cents: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
}

export function serviceDescriptionForJobType(type: JobType): string {
  switch (type) {
    case JobType.BUILDING:
      return 'Building Inspection';
    case JobType.PEST:
      return 'Pest Inspection';
    case JobType.COMBINED:
      return 'Combined Building & Pest Inspection';
    case JobType.PRE_PURCHASE:
      return 'Pre-Purchase Building Inspection';
    case JobType.PRE_SALE:
      return 'Pre-Sale Building Inspection';
    default:
      return 'Inspection Service';
  }
}
