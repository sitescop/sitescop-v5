import {
  LayoutDashboard,
  Briefcase,
  FileSignature,
  ClipboardCheck,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Shield,
  Settings,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { getNavItemsForRole } from '@sitescop/shared-types';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Briefcase,
  FileSignature,
  ClipboardCheck,
  Users,
  Calendar,
  FileText,
  CreditCard,
  Shield,
  Settings,
  Building2,
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  if (!user) return null;

  const navItems = getNavItemsForRole(user.role, hasPermission);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-sidebar flex-col bg-sidebar text-white transition-transform duration-200 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-topbar items-center border-b border-white/10 px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">
              Site<span className="text-accent">Scop</span>
            </span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              V5
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] ?? LayoutDashboard;
              return (
                <li key={item.id}>
                  <NavLink
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-active text-white'
                          : 'text-white/80 hover:bg-sidebar-hover hover:text-white',
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-xs text-white/60">{user.company?.name ?? 'Platform'}</p>
          <p className="truncate text-sm font-medium">{user.firstName} {user.lastName}</p>
        </div>
      </aside>
    </>
  );
}
