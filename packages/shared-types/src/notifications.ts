export enum NotificationType {
  JOB_CREATED = 'JOB_CREATED',
  JOB_ASSIGNED = 'JOB_ASSIGNED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  AGREEMENT_SENT = 'AGREEMENT_SENT',
  AGREEMENT_SIGNED = 'AGREEMENT_SIGNED',
  AGREEMENT_DECLINED = 'AGREEMENT_DECLINED',
  INVOICE_SENT = 'INVOICE_SENT',
  INVOICE_PAID = 'INVOICE_PAID',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  SYSTEM = 'SYSTEM',
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}
