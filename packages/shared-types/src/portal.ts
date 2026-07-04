import type { AgreementSummary } from './agreements.js';
import type { InvoiceSummary } from './invoices.js';

export interface ClientPortalReportSummary {
  id: string;
  reportType: string;
  fileName: string;
  inspectionId: string;
  inspectionNumber: string;
  jobNumber: string;
  propertyAddress: string | null;
  generatedAt: string | null;
}

export interface ClientPortalResponse {
  agreements: AgreementSummary[];
  invoices: InvoiceSummary[];
  reports: ClientPortalReportSummary[];
  stripeEnabled: boolean;
}

export interface StripeCheckoutResponse {
  url: string;
}

export interface StripeConfirmPaymentRequest {
  sessionId: string;
}
