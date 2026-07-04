import type {
  ClientPortalResponse,
  StripeCheckoutResponse,
  StripeConfirmPaymentRequest,
} from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function portalPdfUrl(path: string, inline: boolean): string {
  const suffix = inline ? '?inline=1' : '';
  return `${API_BASE}${path}${suffix}`;
}

export const portalApi = {
  get: () => apiRequest<ClientPortalResponse>('/api/v1/portal'),
  checkout: (invoiceId: string) =>
    apiRequest<StripeCheckoutResponse>(`/api/v1/portal/invoices/${invoiceId}/checkout`, {
      method: 'POST',
    }),
  confirmPayment: (body: StripeConfirmPaymentRequest) =>
    apiRequest<{ invoiceId: string; alreadyPaid: boolean }>('/api/v1/portal/payments/confirm', {
      method: 'POST',
      body,
    }),
};

async function readPortalPdfError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => ({}));
    return (data as { error?: string }).error ?? 'Request failed';
  }
  const text = await response.text().catch(() => '');
  if (text) {
    try {
      const data = JSON.parse(text) as { error?: string };
      return data.error ?? 'Request failed';
    } catch {
      return text.slice(0, 200);
    }
  }
  return `Request failed (${response.status})`;
}

async function fetchPortalPdf(path: string, inline: boolean): Promise<Blob> {
  const response = await fetch(portalPdfUrl(path, inline), {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await readPortalPdfError(response));
  }
  const blob = await response.blob();
  if (!blob.type.includes('pdf') && blob.size < 2048) {
    const text = await blob.text();
    try {
      const data = JSON.parse(text) as { error?: string };
      throw new Error(data.error ?? 'Unable to open PDF');
    } catch (error) {
      if (error instanceof Error && error.message !== 'Unable to open PDF') {
        throw error;
      }
      throw new Error(text || 'Unable to open PDF');
    }
  }
  return blob;
}

async function openPortalPdf(path: string, fileName: string): Promise<void> {
  const blob = await fetchPortalPdf(path, true);
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function downloadPortalPdf(path: string, fileName: string): Promise<void> {
  const blob = await fetchPortalPdf(path, false);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function viewPortalReport(id: string, fileName: string): Promise<void> {
  await openPortalPdf(`/api/v1/portal/reports/${id}/download`, fileName);
}

export async function viewPortalInvoice(id: string, fileName: string): Promise<void> {
  await openPortalPdf(`/api/v1/portal/invoices/${id}/download`, fileName);
}

export async function viewPortalAgreement(id: string, fileName: string): Promise<void> {
  await openPortalPdf(`/api/v1/portal/agreements/${id}/download`, fileName);
}

export async function downloadPortalReport(id: string, fileName: string): Promise<void> {
  await downloadPortalPdf(`/api/v1/portal/reports/${id}/download`, fileName);
}

export async function downloadPortalInvoice(id: string, fileName: string): Promise<void> {
  await downloadPortalPdf(`/api/v1/portal/invoices/${id}/download`, fileName);
}

export async function downloadPortalAgreement(id: string, fileName: string): Promise<void> {
  await downloadPortalPdf(`/api/v1/portal/agreements/${id}/download`, fileName);
}
