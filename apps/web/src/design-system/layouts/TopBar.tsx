import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, User } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { USER_ROLE_LABELS } from '@sitescop/shared-types';
import { useAuthStore } from '@/modules/auth/store/auth-store';
import { notificationsApi } from '@/lib/api/notifications';
import { Badge } from '@/design-system/components/Badge';
import { Button } from '@/design-system/components/Button';
import { cn } from '@/lib/utils';

interface TopBarProps {
  onMenuClick: () => void;
}

function notificationHref(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'Job':
      return `/jobs/${entityId}`;
    case 'Agreement':
      return `/agreements/${entityId}`;
    case 'Invoice':
      return `/accounts/${entityId}`;
    default:
      return null;
  }
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 60_000,
  });

  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationsApi.list({ pageSize: '10' }),
    enabled: notificationsOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = unreadData?.unreadCount ?? 0;

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
        <DropdownMenu.Root open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="relative rounded-sm p-2 text-text-light hover:bg-background"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={cn(
                'z-50 w-[360px] rounded-sm border border-border bg-surface p-1 shadow-elevated',
              )}
              sideOffset={8}
              align="end"
            >
              <div className="flex items-center justify-between px-3 py-2">
                <DropdownMenu.Label className="text-sm font-semibold text-text">
                  Notifications
                </DropdownMenu.Label>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllMutation.mutate()}
                    isLoading={markAllMutation.isPending}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              {notificationsLoading && (
                <p className="px-3 py-4 text-sm text-text-light">Loading...</p>
              )}
              {!notificationsLoading && !notificationsData?.notifications.length && (
                <p className="px-3 py-4 text-sm text-text-light">No notifications yet.</p>
              )}
              {notificationsData?.notifications.map((notification) => {
                const href = notificationHref(notification.entityType, notification.entityId);
                return (
                  <DropdownMenu.Item
                    key={notification.id}
                    className={cn(
                      'cursor-pointer rounded-sm px-3 py-2 outline-none hover:bg-background',
                      !notification.readAt && 'bg-primary/5',
                    )}
                    onSelect={() => {
                      if (!notification.readAt) {
                        markReadMutation.mutate(notification.id);
                      }
                    }}
                    asChild={Boolean(href)}
                  >
                    {href ? (
                      <Link to={href} className="block">
                        <p className="text-sm font-medium text-text">{notification.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-text-light">{notification.body}</p>
                        <p className="mt-1 text-[10px] text-text-muted">
                          {new Date(notification.createdAt).toLocaleString('en-AU')}
                        </p>
                      </Link>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-text">{notification.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-text-light">{notification.body}</p>
                        <p className="mt-1 text-[10px] text-text-muted">
                          {new Date(notification.createdAt).toLocaleString('en-AU')}
                        </p>
                      </div>
                    )}
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

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
