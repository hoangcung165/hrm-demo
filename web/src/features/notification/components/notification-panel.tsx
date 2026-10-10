// The bell panel (artboard `#12 Chuông thông báo và email`): "Thông báo" with "Đánh dấu đã đọc hết", the unread ones
// under "Mới" and the read ones under "Trước đó", the empty state, and "Mở Hộp thư duyệt" at the bottom.
import { BellOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarkRead, useNotifications, type NotificationItem } from '../api';
import { NotificationLine, notificationHref } from './notification-line';

export type NotificationPanelProps = {
  /** A row or the inbox link was chosen: close the panel and go there. */
  onNavigate: (to: string) => void;
};

export function NotificationPanel({ onNavigate }: NotificationPanelProps) {
  const { t } = useTranslation();
  const list = useNotifications(true);
  const { markRead, markAllRead, markingAll } = useMarkRead();
  const items = list.data?.items ?? [];
  const fresh = items.filter((item) => !item.read);
  const earlier = items.filter((item) => item.read);
  const open = (item: NotificationItem) => {
    if (!item.read) markRead(item.id);
    onNavigate(notificationHref(item));
  };
  const group = (label: string, rows: NotificationItem[]) =>
    rows.length ? (
      <div role="group" aria-label={label} className="flex flex-col">
        <span className="px-3 pt-2 pb-1 text-caption text-ink-muted">{label}</span>
        {rows.map((item) => (
          <NotificationLine key={item.id} item={item} onOpen={open} />
        ))}
      </div>
    ) : null;
  return (
    <div className="flex max-h-[min(640px,calc(100dvh-96px))] flex-col">
      <div className="flex items-center gap-2 py-2 pr-3 pl-4">
        <h2 className="flex-1 text-[15px] leading-[22px] font-semibold">{t('notifications.title')}</h2>
        {fresh.length ? (
          <Button variant="ghost" size="sm" disabled={markingAll} onClick={() => markAllRead()}>
            {t('notifications.markAllRead')}
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-1">
        {list.isError ? (
          <ErrorState title={t('notifications.loadError')} onRetry={() => void list.refetch()} />
        ) : !list.data ? (
          <div role="status" aria-busy="true" aria-label={t('notifications.loading')} className="flex flex-col gap-4 px-3 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex items-center gap-3">
                <Skeleton shape="circle" />
                <span className="flex flex-1 flex-col gap-2">
                  <Skeleton className="w-[80%]" />
                  <Skeleton className="w-[40%]" />
                </span>
              </span>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-6 pt-6 pb-8 text-center">
            <BellOff aria-hidden="true" className="mb-1 size-6 stroke-[1.5] text-ink-muted" />
            <span className="font-semibold">{t('notifications.empty.title')}</span>
            <span className="text-ink-muted">{t('notifications.empty.text')}</span>
          </div>
        ) : (
          <>
            {group(t('notifications.new'), fresh)}
            {group(t('notifications.earlier'), earlier)}
          </>
        )}
      </div>
      <div className="border-t border-line p-2">
        <Button variant="ghost" size="sm" className="w-full" onClick={() => onNavigate('/approvals')}>
          {t('notifications.openInbox')}
        </Button>
      </div>
    </div>
  );
}
