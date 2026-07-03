export interface CompanyProfile {
  id: string;
  name: string;
  slug: string;
  abn: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  logoUrl: string | null;
}

export interface CompanyPreferences {
  primaryColor: string;
  secondaryColor: string;
  reportHeader: string | null;
  reportFooter: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  emailSignature: string | null;
  smsEnabled: boolean;
  smsSenderId: string | null;
  pdfFooterText: string | null;
  pdfIncludeLogo: boolean;
  notifyNewJob: boolean;
  notifyJobAssigned: boolean;
  notifyJobCompleted: boolean;
  defaultBuildingPrice: number | null;
  defaultPestPrice: number | null;
  defaultCombinedPrice: number | null;
  gstRate: number;
  emailTemplates: Record<string, string>;
  smsTemplates: Record<string, string>;
  integrations: Record<string, unknown>;
  agreementTemplates: Record<string, { sections: Array<{ id: string; title: string; content: string }> }>;
  backupEnabled: boolean;
  backupFrequency: string;
}

export interface CompanySettingsResponse {
  company: CompanyProfile;
  preferences: CompanyPreferences;
}

export interface UpdateCompanyProfileRequest {
  name?: string;
  abn?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  logoUrl?: string;
}

export interface UpdateCompanyPreferencesRequest extends Partial<CompanyPreferences> {}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKeyRecord;
  secret: string;
}
