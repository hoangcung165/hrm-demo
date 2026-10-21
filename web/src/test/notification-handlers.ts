// MSW handlers for the bell ("## API contract" comment on issue #14, BE-5): the list, the unread count, and marking
// one or all as read, over fixture notifications for Trần Thị Mai (HR). Times are relative to now.
import { http, HttpResponse } from 'msw';
import type { NotificationItem } from '@/features/notification/api';
import { problem } from './auth-handlers';
import { AN, approvalId, BAO, HUNG } from './approval-fixtures';

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const item = (n: number, overrides: Partial<NotificationItem>): NotificationItem => ({
  id: `n-${n}`,
  kind: 'APPROVAL_WAITING',
  actor: AN,
  onBehalfOf: null,
  requestId: approvalId(1),
  requestType: 'PROFILE_UPDATE',
  summary: 'Số điện thoại, địa chỉ',
  level: 2,
  delegationId: null,
  targetPath: null,
  createdAt: ago(30),
  read: false,
  ...overrides,
});

export const NOTIFICATIONS: NotificationItem[] = [
  item(1, {}),
  item(2, { kind: 'DELEGATION_RECEIVED', actor: BAO, requestId: null, requestType: null, summary: null, level: null, delegationId: 'd-1', createdAt: ago(90) }),
  item(3, { kind: 'APPROVAL_APPROVED', actor: HUNG, requestId: approvalId(12), summary: 'Email cá nhân', createdAt: ago(60 * 30), read: true }),
  item(4, { kind: 'APPROVAL_APPROVED', actor: null, requestId: approvalId(12), summary: 'Email cá nhân', createdAt: ago(60 * 50), read: true }),
];

export type NotificationApi = { handlers: Array<ReturnType<typeof http.get>>; reads: string[] };

export function notificationApi(source: NotificationItem[] = NOTIFICATIONS): NotificationApi {
  const items = source.map((n) => ({ ...n }));
  const reads: string[] = [];
  const unread = () => items.filter((n) => !n.read).length;
  return {
    reads,
    handlers: [
      http.get('*/api/notifications/unread-count', () => HttpResponse.json({ unread: unread() })),
      http.get('*/api/notifications', () => HttpResponse.json({ items, total: items.length, unread: unread() })),
      http.post('*/api/notifications/read-all', () => {
        reads.push('all');
        items.forEach((n) => (n.read = true));
        return HttpResponse.json({ unread: 0 });
      }),
      http.post('*/api/notifications/:id/read', ({ params }) => {
        const found = items.find((n) => n.id === params.id);
        if (!found) return problem(404, 'notification.not_found');
        reads.push(found.id);
        found.read = true;
        return HttpResponse.json({ unread: unread() });
      }),
    ],
  };
}
