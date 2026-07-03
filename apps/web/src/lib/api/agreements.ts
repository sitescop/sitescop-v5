import type {
  AgreementDetail,
  AgreementsListResponse,
  AgreementLegalContent,
  CreateAgreementRequest,
  CreateAndSendAgreementResponse,
  SendAgreementResponse,
  SendNewAgreementRequest,
  UpdateAgreementRequest,
} from '@sitescop/shared-types';
import { JobType } from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const agreementsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest<AgreementsListResponse>(`/api/v1/agreements${query}`);
  },
  get: (id: string) => apiRequest<{ agreement: AgreementDetail }>(`/api/v1/agreements/${id}`),
  create: (body: CreateAgreementRequest) =>
    apiRequest<{ agreement: AgreementDetail }>('/api/v1/agreements', { method: 'POST', body }),
  sendNew: (body: SendNewAgreementRequest) =>
    apiRequest<CreateAndSendAgreementResponse>('/api/v1/agreements/send-new', {
      method: 'POST',
      body,
    }),
  createFromJob: (jobId: string) =>
    apiRequest<{ agreement: AgreementDetail }>(`/api/v1/agreements/from-job/${jobId}`, {
      method: 'POST',
    }),
  update: (id: string, body: UpdateAgreementRequest) =>
    apiRequest<{ agreement: AgreementDetail }>(`/api/v1/agreements/${id}`, { method: 'PATCH', body }),
  send: (id: string) =>
    apiRequest<SendAgreementResponse>(`/api/v1/agreements/${id}/send`, { method: 'POST' }),
  cancel: (id: string) =>
    apiRequest<{ agreement: AgreementDetail }>(`/api/v1/agreements/${id}/cancel`, { method: 'POST' }),
  getTemplate: (type: JobType) =>
    apiRequest<{ template: AgreementLegalContent }>(`/api/v1/agreements/templates/${type}`),
  updateTemplate: (type: JobType, template: AgreementLegalContent) =>
    apiRequest<{ template: AgreementLegalContent }>(`/api/v1/agreements/templates/${type}`, {
      method: 'PUT',
      body: { template },
    }),
  getPublic: (token: string) =>
    apiRequest<{ agreement: import('@sitescop/shared-types').PublicAgreementView }>(
      `/api/v1/agreements/public/${token}`,
    ),
  markViewed: (token: string) =>
    apiRequest<{ agreement: import('@sitescop/shared-types').PublicAgreementView }>(
      `/api/v1/agreements/public/${token}/view`,
      { method: 'POST' },
    ),
  sign: (token: string, body: import('@sitescop/shared-types').SignAgreementRequest) =>
    apiRequest<{ success: true; agreementNumber: string }>(
      `/api/v1/agreements/public/${token}/sign`,
      { method: 'POST', body },
    ),
  decline: (token: string, body?: import('@sitescop/shared-types').DeclineAgreementRequest) =>
    apiRequest<{ success: true }>(`/api/v1/agreements/public/${token}/decline`, {
      method: 'POST',
      body: body ?? {},
    }),
  downloadPdf: downloadAgreementPdf,
};

export async function downloadAgreementPdf(id: string, fileName: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/agreements/${id}/download`, {
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
