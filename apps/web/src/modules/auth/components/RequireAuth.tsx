import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Permission } from '@sitescop/shared-types';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { LoadingOverlay } from '@/design-system/components/LoadingOverlay';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading, loadSession } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (isLoading) {
    return <LoadingOverlay message="Loading session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

interface RequirePermissionProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ permission, children, fallback }: RequirePermissionProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission(permission));

  if (!hasPermission) {
    return (
      fallback ?? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-card">
          <h2 className="text-lg font-semibold text-text">Access denied</h2>
          <p className="mt-2 text-text-light">You do not have permission to view this page.</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
