import { Bell, LogOut, Menu, Search, User } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { USER_ROLE_LABELS } from '@sitescop/shared-types';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { Badge } from '@/design-system/components/Badge';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="sticky top-0 z-30 flex h-topbar items-center gap-4 border-b border-border bg-surface px-4 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-sm p-2 text-text-light hover:bg-background lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
        <input
          type="search"
          placeholder="Search jobs, clients, agreements..."
          className="form-input pl-10"
          aria-label="Global search"
          disabled
          title="Global search available in Phase 1"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="relative rounded-sm p-2 text-text-light hover:bg-background"
          aria-label="Notifications"
          title="Notifications available in Phase 6"
        >
          <Bell className="h-5 w-5" />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-background"
              aria-label="User menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-text">
                  {user?.firstName} {user?.lastName}
                </p>
                {user && (
                  <Badge variant="primary" className="mt-0.5">
                    {USER_ROLE_LABELS[user.role]}
                  </Badge>
                )}
              </div>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={cn(
                'z-50 min-w-[200px] rounded-sm border border-border bg-surface p-1 shadow-elevated',
              )}
              sideOffset={8}
              align="end"
            >
              <DropdownMenu.Label className="px-2 py-1.5 text-xs text-text-light">
                {user?.email}
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-danger outline-none hover:bg-danger/5"
                onSelect={() => void logout()}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
