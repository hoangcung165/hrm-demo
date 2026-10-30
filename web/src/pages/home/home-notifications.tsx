import { BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { DashboardWidget } from '@/components/ui/dashboard-widget';
import { useMarkRead, useNotifications, type NotificationItem } from '@/features/notification/api';
import { NotificationLine, notificationHref } from '@/features/notification/components/notification-line';

/** The latest notifications shown; older ones are in the bell. */
const SHOWN = 5;

export type HomeNotificationsProps = { className?: string };

/** "Thông báo gần đây": the same notifications as the bell, opened and marked read the same way. */
export function HomeNotifications({ className }: HomeNotificationsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const list = useNotifications(true);
  const { markRead } = useMarkRead();
  const items = (list.data?.items ?? []).slice(0, SHOWN);
  const open = (item: NotificationItem) => {
    if (!item.read) markRead(item.id);
    void navigate(notificationHref(item));
  };
  return (
    <DashboardWidget
      title={t('dashboard.employee.notifications.title')}
      loading={list.isPending}
      error={list.isError ? { title: t('notifications.loadError'), onRetry: () => void list.refetch() } : undefined}
      empty={list.data && items.length === 0 ? { icon: <BellOff />, title: t('notifications.empty.title'), text: t('notifications.empty.text') } : undefined}
      className={className}
    >
      <ul aria-label={t('dashboard.employee.notifications.title')}>
        {items.map((item) => (
          <li key={item.id}>
            <NotificationLine item={item} onOpen={open} />
          </li>
        ))}
      </ul>
    </DashboardWidget>
  );
}
