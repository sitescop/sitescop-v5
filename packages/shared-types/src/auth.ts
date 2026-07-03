export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  OFFICE_MANAGER = 'OFFICE_MANAGER',
  OFFICE_STAFF = 'OFFICE_STAFF',
  INSPECTOR = 'INSPECTOR',
  ACCOUNTANT = 'ACCOUNTANT',
  CLIENT = 'CLIENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.COMPANY_ADMIN]: 'Company Admin',
  [UserRole.OFFICE_MANAGER]: 'Office Manager',
  [UserRole.OFFICE_STAFF]: 'Office Staff',
  [UserRole.INSPECTOR]: 'Inspector',
  [UserRole.ACCOUNTANT]: 'Accountant',
  [UserRole.CLIENT]: 'Client',
};

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  abn?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  company: CompanySummary | null;
  status: UserStatus;
  lastLoginAt: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface DashboardActivity {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
}

export interface RoleDashboardData {
  role: UserRole;
  stats: DashboardStat[];
  activities: DashboardActivity[];
  quickActions: Array<{ id: string; label: string; href: string }>;
}
