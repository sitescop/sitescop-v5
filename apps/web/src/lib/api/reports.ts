import type { GenerateReportsResponse, ReportsListResponse } from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const reportsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<ReportsListResponse>(`/api/v1/reports${query}`);
  },
  get: (id: string) =>
    apiRequest<{ report: import('@sitescop/shared-types').ReportSummary }>(`/api/v1/reports/${id}`),
  listForInspection: (inspectionId: string) =>
    apiRequest<GenerateReportsResponse>(`/api/v1/inspections/${inspectionId}/reports`),
  generate: (inspectionId: string) =>
    apiRequest<GenerateReportsResponse>(`/api/v1/inspections/${inspectionId}/reports/generate`, {
      method: 'POST',
    }),
  downloadUrl: (id: string) => `${API_BASE}/api/v1/reports/${id}/download`,
};

export async function downloadReport(id: string, fileName: string): Promise<void> {
  const response = await fetch(reportsApi.downloadUrl(id), {
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
