import { Navigate } from 'react-router-dom';
import { UserRole } from '@sitescop/shared-types';
import { useAuthStore } from '@/modules/auth/store/auth-store';

export function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === UserRole.CLIENT) {
    return <Navigate to="/portal" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export function getPostLoginPath(role: UserRole): string {
  return role === UserRole.CLIENT ? '/portal' : '/dashboard';
}
