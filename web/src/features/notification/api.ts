// Notifications API (Chuông thông báo, HRM-12/BE-5). Contract: "## API contract" comment on issue #14 (BE-5).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApprovalRequestType, EmployeeCard } from '@/features/approval/api';
import { api } from '@/lib/api';

export type NotificationKind =
  | 'APPROVAL_WAITING'
  | 'APPROVAL_RESUBMITTED'
  | 'APPROVAL_APPROVED'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_RETURNED'
  | 'DELEGATION_RECEIVED';

/** Mirrors the backend record `NotificationItem`: one line of the bell, newest first. `actor` null: the system. */
export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  actor: EmployeeCard | null;
  onBehalfOf: EmployeeCard | null;
  requestId: string | null;
  requestType: ApprovalRequestType | null;
  summary: string | null;
  level: number | null;
  delegationId: string | null;
  createdAt: string;
  read: boolean;
};

export type NotificationsPage = { items: NotificationItem[]; total: number; unread: number };
type UnreadCount = { unread: number };

export const NOTIFICATIONS_KEY = ['notifications'] as const;
const UNREAD_KEY = [...NOTIFICATIONS_KEY, 'unread'] as const;
const LIST_KEY = [...NOTIFICATIONS_KEY, 'list'] as const;
/** The panel shows the latest ones; older ones are in the inbox's tabs. */
export const NOTIFICATION_PAGE_SIZE = 20;

/** The count on the bell, refreshed every minute; only for an Account linked to an Employee. */
export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: UNREAD_KEY,
    queryFn: async () => (await api<UnreadCount>('/api/notifications/unread-count')).unread,
    enabled,
    refetchInterval: 60_000,
  });
}

/** The latest notifications, loaded when the panel opens. */
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: () => api<NotificationsPage>(`/api/notifications?page=0&size=${NOTIFICATION_PAGE_SIZE}`),
    enabled,
  });
}

/** Marks one or all as read; the bell's count and the panel follow without another request. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  const apply = (unread: number, read: (item: NotificationItem) => boolean) => {
    queryClient.setQueryData(UNREAD_KEY, unread);
    queryClient.setQueryData<NotificationsPage>(LIST_KEY, (page) =>
      page ? { ...page, unread, items: page.items.map((item) => (read(item) ? { ...item, read: true } : item)) } : page,
    );
  };
  const one = useMutation({
    mutationFn: (id: string) => api<UnreadCount>(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: ({ unread }, id) => apply(unread, (item) => item.id === id),
  });
  const all = useMutation({
    mutationFn: () => api<UnreadCount>('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: ({ unread }) => apply(unread, () => true),
  });
  return { markRead: one.mutate, markAllRead: all.mutate, markingAll: all.isPending };
}
