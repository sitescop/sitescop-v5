import { JobType } from './jobs.js';

export enum AgreementStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  SIGNED = 'SIGNED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  [AgreementStatus.DRAFT]: 'Draft',
  [AgreementStatus.SENT]: 'Sent',
  [AgreementStatus.VIEWED]: 'Viewed',
  [AgreementStatus.SIGNED]: 'Signed',
  [AgreementStatus.DECLINED]: 'Declined',
  [AgreementStatus.EXPIRED]: 'Expired',
  [AgreementStatus.CANCELLED]: 'Cancelled',
};

export interface AgreementLegalSection {
  id: string;
  title: string;
  content: string;
}

export interface AgreementLegalContent {
  sections: AgreementLegalSection[];
}

export interface AgreementSummary {
  id: string;
  agreementNumber: string;
  status: AgreementStatus;
  type: JobType;
  clientName: string;
  clientEmail: string;
  propertyAddress: string;
  priceCents: number;
  totalCents: number;
  jobId: string | null;
  jobNumber: string | null;
  sentAt: string | null;
  signedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementDetail extends AgreementSummary {
  clientPhone: string | null;
  clientContactId: string | null;
  gstCents: number;
  agreementDate: string;
  notes: string | null;
  legalSections: AgreementLegalContent;
  viewedAt: string | null;
  declinedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string | null;
  declineReason: string | null;
  signatureName: string | null;
  declarationsAccepted: boolean;
  createdByName: string;
}

export interface AgreementsListResponse {
  agreements: AgreementSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateAgreementRequest {
  jobId?: string;
  type: JobType;
  clientContactId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  propertyAddress: string;
  priceCents: number;
  agreementDate?: string;
  notes?: string;
}

export interface UpdateAgreementRequest extends Partial<CreateAgreementRequest> {}

export interface SignAgreementRequest {
  signatureName: string;
  signatureData: string;
  declarationsAccepted: boolean;
  propertyAddress?: string;
  clientPhone?: string;
}

export interface DeclineAgreementRequest {
  reason?: string;
}

export interface PublicAgreementView {
  id: string;
  agreementNumber: string;
  status: AgreementStatus;
  type: JobType;
  companyName: string;
  clientName: string;
  clientEmailMasked: string;
  propertyAddress: string;
  priceCents: number;
  gstCents: number;
  totalCents: number;
  agreementDate: string;
  legalSections: AgreementLegalContent;
  canSign: boolean;
  propertyPending: boolean;
}

export interface SendAgreementResponse {
  agreement: AgreementDetail;
  signingUrl: string;
  devSigningUrl?: string;
  emailSent: boolean;
  emailError?: string;
}

export interface SignAgreementResponse {
  success: true;
  agreementNumber: string;
  jobId: string | null;
  jobNumber: string | null;
}

export interface SendNewAgreementRequest {
  type: JobType;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  propertyAddress?: string;
  priceCents: number;
  notes?: string;
}

export interface CreateAndSendAgreementResponse extends SendAgreementResponse {
  contactCreated: boolean;
}
