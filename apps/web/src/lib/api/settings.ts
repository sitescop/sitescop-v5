import type {
  CompanySettingsResponse,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateCompanyPreferencesRequest,
  UpdateCompanyProfileRequest,
  ApiKeyRecord,
} from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

export const settingsApi = {
  get: () => apiRequest<CompanySettingsResponse>('/api/v1/settings/company'),
  updateCompany: (body: UpdateCompanyProfileRequest) =>
    apiRequest<CompanySettingsResponse>('/api/v1/settings/company', { method: 'PATCH', body }),
  updatePreferences: (body: UpdateCompanyPreferencesRequest) =>
    apiRequest<CompanySettingsResponse>('/api/v1/settings/preferences', { method: 'PATCH', body }),
  listApiKeys: () => apiRequest<{ apiKeys: ApiKeyRecord[] }>('/api/v1/settings/api-keys'),
  createApiKey: (body: CreateApiKeyRequest) =>
    apiRequest<CreateApiKeyResponse>('/api/v1/settings/api-keys', { method: 'POST', body }),
  deleteApiKey: (id: string) =>
    apiRequest<{ success: true }>(`/api/v1/settings/api-keys/${id}`, { method: 'DELETE' }),
  getSmsStatus: () =>
    apiRequest<{
      twilio: { configured: boolean; fromNumber: string; reason: string | null };
      companyEnabled: boolean;
      senderId: string | null;
    }>('/api/v1/settings/sms/status'),
  sendTestSms: (body: { toPhone: string }) =>
    apiRequest<{ toPhone: string; sent: boolean; error?: string }>('/api/v1/settings/sms/test', {
      method: 'POST',
      body,
    }),
};
