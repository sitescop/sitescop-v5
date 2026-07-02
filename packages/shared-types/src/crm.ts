export enum ContactType {
  CLIENT = 'CLIENT',
  AGENT = 'AGENT',
  BUILDER = 'BUILDER',
  PROPERTY_MANAGER = 'PROPERTY_MANAGER',
}

export enum ContactStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  [ContactType.CLIENT]: 'Client',
  [ContactType.AGENT]: 'Agent',
  [ContactType.BUILDER]: 'Builder',
  [ContactType.PROPERTY_MANAGER]: 'Property Manager',
};

export interface ContactRecord {
  id: string;
  type: ContactType;
  status: ContactStatus;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  abn: string | null;
  address: string | null;
  notes: string | null;
  displayName: string;
  jobCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactDetail extends ContactRecord {
  jobs: Array<{
    id: string;
    jobNumber: string;
    title: string;
    status: string;
    scheduledDate: string | null;
    createdAt: string;
  }>;
}

export interface ContactsListResponse {
  contacts: ContactRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateContactRequest {
  type: ContactType;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  abn?: string;
  address?: string;
  notes?: string;
  status?: ContactStatus;
}

export interface UpdateContactRequest extends Partial<CreateContactRequest> {}
