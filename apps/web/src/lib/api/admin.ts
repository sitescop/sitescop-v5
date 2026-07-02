import type {
  AdminCompaniesListResponse,
  AdminCompanyRecord,
  AdminUserRecord,
  AdminUsersListResponse,
  AuditLogsListResponse,
  CreateCompanyRequest,
  CreateUserRequest,
  JobsListResponse,
  UpdateCompanyRequest,
  UpdateUserRequest,
} from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

export interface AdminOverview {
  stats: { users: number; jobs: number; contacts: number };
  recentActivity: Array<{ id: string; action: string; actorName: string; createdAt: string }>;
}

export const adminApi = {
  overview: () => apiRequest<AdminOverview>('/api/v1/admin/overview'),
  listUsers: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest<AdminUsersListResponse>(`/api/v1/admin/users${query}`);
  },
  createUser: (body: CreateUserRequest) =>
    apiRequest<{ user: AdminUserRecord }>('/api/v1/admin/users', { method: 'POST', body }),
  updateUser: (id: string, body: UpdateUserRequest) =>
    apiRequest<{ user: AdminUserRecord }>(`/api/v1/admin/users/${id}`, { method: 'PATCH', body }),
  deactivateUser: (id: string) =>
    apiRequest<{ user: AdminUserRecord }>(`/api/v1/admin/users/${id}/deactivate`, { method: 'POST' }),
  auditLogs: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest<AuditLogsListResponse>(`/api/v1/admin/audit-logs${query}`);
  },
  listJobs: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest<JobsListResponse>(`/api/v1/admin/jobs${query}`);
  },
  listCompanies: () => apiRequest<AdminCompaniesListResponse>('/api/v1/admin/companies'),
  createCompany: (body: CreateCompanyRequest) =>
    apiRequest<{ company: AdminCompanyRecord }>('/api/v1/admin/companies', { method: 'POST', body }),
  updateCompany: (id: string, body: UpdateCompanyRequest) =>
    apiRequest<{ company: AdminCompanyRecord }>(`/api/v1/admin/companies/${id}`, { method: 'PATCH', body }),
};
