import type {
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  Permission,
  ResetPasswordRequest,
  RoleDashboardData,
} from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

export interface SessionResponse {
  user: AuthUser;
  permissions: Permission[];
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiRequest<LoginResponse>('/api/v1/auth/login', { method: 'POST', body: data }),

  logout: () => apiRequest<{ success: boolean }>('/api/v1/auth/logout', { method: 'POST' }),

  session: () => apiRequest<SessionResponse>('/api/v1/auth/session'),

  me: () => apiRequest<SessionResponse>('/api/v1/auth/me'),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiRequest<{ message: string; devResetUrl?: string }>('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: data,
    }),

  resetPassword: (data: ResetPasswordRequest) =>
    apiRequest<{ message: string }>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: data,
    }),
};

export const dashboardApi = {
  get: () => apiRequest<RoleDashboardData>('/api/v1/dashboard'),
};
