// The bell in the header: the unread count on it, and the panel of notifications it opens. Shown to Accounts linked
// to an Employee, who are the ones notified.
import { Bell } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '../api';
import { NotificationPanel } from './notification-panel';

export type NotificationBellProps = {
  /** The Account is linked to an Employee; otherwise the bell has nothing to show. */
  enabled: boolean;
};

export function NotificationBell({ enabled }: NotificationBellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount(enabled).data ?? 0;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? t('notifications.bellUnread', { count: unread }) : t('notifications.bell')}
          className={cn(
            'relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-md text-ink hover:bg-surface-muted md:size-10 [&_svg]:size-5 [&_svg]:stroke-[1.5]',
            open && 'bg-brand-blue-soft text-brand-blue hover:bg-brand-blue-soft',
          )}
        >
          <Bell aria-hidden="true" />
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-surface bg-warning-soft px-1 text-[11px] leading-none font-semibold text-warning tabular-nums md:top-0 md:-right-1"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={8}
          aria-label={t('notifications.title')}
          className="z-50 w-[min(400px,calc(100vw-16px))] rounded-md border border-line bg-surface shadow-lg outline-none"
        >
          <NotificationPanel
            onNavigate={(to) => {
              setOpen(false);
              navigate(to);
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
