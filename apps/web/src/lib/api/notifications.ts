import type { NotificationsListResponse, UnreadCountResponse } from '@sitescop/shared-types';
import { apiRequest } from '../api-client';

export const notificationsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest<NotificationsListResponse>(`/api/v1/notifications${query}`);
  },
  unreadCount: () => apiRequest<UnreadCountResponse>('/api/v1/notifications/unread-count'),
  markRead: (id: string) =>
    apiRequest<{ notification: import('@sitescop/shared-types').NotificationItem }>(
      `/api/v1/notifications/${id}/read`,
      { method: 'POST' },
    ),
  markAllRead: () =>
    apiRequest<{ updated: number }>('/api/v1/notifications/read-all', { method: 'POST' }),
};
