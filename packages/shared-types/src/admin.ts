import type { UserRole, UserStatus } from './auth.js';

export interface AdminUserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  companyId: string | null;
  companyName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminUsersListResponse {
  users: AdminUserRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password?: string;
  companyId?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  password?: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  actorName: string | null;
  companyName: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogsListResponse {
  logs: AuditLogRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminCompanyRecord {
  id: string;
  name: string;
  slug: string;
  abn: string | null;
  email: string | null;
  phone: string | null;
  userCount: number;
  jobCount: number;
  createdAt: string;
}

export interface AdminCompaniesListResponse {
  companies: AdminCompanyRecord[];
  total: number;
}

export interface CreateCompanyRequest {
  name: string;
  slug: string;
  abn?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateCompanyRequest extends Partial<CreateCompanyRequest> {}
