import type {
  ContactDetail,
  ContactRecord,
  ContactsListResponse,
  CreateContactRequest,
  UpdateContactRequest,
} from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

export const crmApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest<ContactsListResponse>(`/api/v1/crm/contacts${query}`);
  },
  get: (id: string) => apiRequest<{ contact: ContactDetail }>(`/api/v1/crm/contacts/${id}`),
  create: (body: CreateContactRequest) =>
    apiRequest<{ contact: ContactRecord }>('/api/v1/crm/contacts', { method: 'POST', body }),
  update: (id: string, body: UpdateContactRequest) =>
    apiRequest<{ contact: ContactRecord }>(`/api/v1/crm/contacts/${id}`, { method: 'PATCH', body }),
  remove: (id: string) =>
    apiRequest<{ success: true }>(`/api/v1/crm/contacts/${id}`, { method: 'DELETE' }),
};
