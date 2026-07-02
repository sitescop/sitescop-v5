import { create } from 'zustand';
import type { AuthUser } from '@sitescop/shared-types';
import type { Permission } from '@sitescop/shared-types';
import { roleHasPermission } from '@sitescop/shared-types';
import { authApi } from '@/lib/api/auth';

interface AuthState {
  user: AuthUser | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (user: AuthUser, permissions: Permission[]) => void;
  clearSession: () => void;
  loadSession: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  isLoading: false,
  isAuthenticated: false,

  setSession: (user, permissions) =>
    set({ user, permissions, isAuthenticated: true, isLoading: false }),

  clearSession: () =>
    set({ user: null, permissions: [], isAuthenticated: false, isLoading: false }),

  loadSession: async () => {
    set({ isLoading: true });
    try {
      const { user, permissions } = await authApi.session();
      set({ user, permissions, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ user: null, permissions: [], isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  login: async (email, password) => {
    const { user } = await authApi.login({ email, password });
    const session = await authApi.me();
    set({
      user,
      permissions: session.permissions,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      get().clearSession();
    }
  },

  hasPermission: (permission) => {
    const { user } = get();
    if (!user) return false;
    return roleHasPermission(user.role, permission);
  },
}));
