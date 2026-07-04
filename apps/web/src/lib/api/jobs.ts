import type {
  AssignJobRequest,
  CreateJobRequest,
  CreateManualJobRequest,
  DeclineJobRequest,
  JobDetail,
  JobsListResponse,
  UpdateJobRequest,
  UserSummary,
} from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

export const jobsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest<JobsListResponse>(`/api/v1/jobs${query}`);
  },
  get: (id: string) => apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}`),
  create: (body: CreateJobRequest) =>
    apiRequest<{ job: JobDetail }>('/api/v1/jobs', { method: 'POST', body }),
  createManual: (body: CreateManualJobRequest) =>
    apiRequest<{ job: JobDetail }>('/api/v1/jobs/manual', { method: 'POST', body }),
  update: (id: string, body: UpdateJobRequest) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}`, { method: 'PATCH', body }),
  assign: (id: string, body: AssignJobRequest) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}/assign`, { method: 'POST', body }),
  accept: (id: string) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}/accept`, { method: 'POST' }),
  decline: (id: string, body?: DeclineJobRequest) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}/decline`, { method: 'POST', body }),
  start: (id: string) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}/start`, { method: 'POST' }),
  complete: (id: string) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}/complete`, { method: 'POST' }),
  cancel: (id: string) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}/cancel`, { method: 'POST' }),
  archive: (id: string) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}/archive`, { method: 'POST' }),
  unarchive: (id: string) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}/unarchive`, { method: 'POST' }),
  remove: (id: string) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    apiRequest<{ job: JobDetail }>(`/api/v1/jobs/${id}/restore`, { method: 'POST' }),
  permanentDelete: (id: string) =>
    apiRequest<{ success: true }>(`/api/v1/jobs/${id}/permanent`, { method: 'DELETE' }),
  listInspectors: () =>
    apiRequest<{ inspectors: UserSummary[] }>('/api/v1/jobs/inspectors'),
  sendAgreement: (id: string) =>
    apiRequest<import('@sitescop/shared-types').SendJobAgreementResponse>(
      `/api/v1/jobs/${id}/send-agreement`,
      { method: 'POST' },
    ),
};
