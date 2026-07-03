import type {
  CreateInvoiceRequest,
  InvoiceDetail,
  InvoicesListResponse,
  MarkInvoicePaidRequest,
  SendInvoiceResponse,
  UpdateInvoiceRequest,
} from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const invoicesApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest<InvoicesListResponse>(`/api/v1/invoices${query}`);
  },
  get: (id: string) => apiRequest<{ invoice: InvoiceDetail }>(`/api/v1/invoices/${id}`),
  create: (body: CreateInvoiceRequest) =>
    apiRequest<{ invoice: InvoiceDetail }>('/api/v1/invoices', { method: 'POST', body }),
  createFromAgreement: (agreementId: string) =>
    apiRequest<{ invoice: InvoiceDetail }>(`/api/v1/invoices/from-agreement/${agreementId}`, {
      method: 'POST',
    }),
  update: (id: string, body: UpdateInvoiceRequest) =>
    apiRequest<{ invoice: InvoiceDetail }>(`/api/v1/invoices/${id}`, { method: 'PATCH', body }),
  send: (id: string) =>
    apiRequest<SendInvoiceResponse>(`/api/v1/invoices/${id}/send`, { method: 'POST' }),
  markPaid: (id: string, body: MarkInvoicePaidRequest) =>
    apiRequest<{ invoice: InvoiceDetail }>(`/api/v1/invoices/${id}/mark-paid`, {
      method: 'POST',
      body,
    }),
  void: (id: string) =>
    apiRequest<{ invoice: InvoiceDetail }>(`/api/v1/invoices/${id}/void`, { method: 'POST' }),
};

export async function downloadInvoice(id: string, fileName: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/invoices/${id}/download`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Download failed');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
