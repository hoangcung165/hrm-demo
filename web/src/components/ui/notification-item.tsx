// Library component "Notification item" (bell panel): Avatar with a small status mark, one or two lines of text with
// the person in bold, a caption (when, and what), and a dot while unread. The whole row is a link.
import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from './avatar';

export type NotificationTone = 'warning' | 'success' | 'danger' | 'info';

export type NotificationItemProps = {
  /** Whose Avatar; the system has none and shows the mark alone. */
  avatarName: string | null;
  tone: NotificationTone;
  /** Lucide icon of the mark, drawn at 10px. */
  icon: ReactNode;
  /** "<b>Nguyễn Văn An</b> gửi cập nhật hồ sơ, chờ bạn duyệt". */
  text: ReactNode;
  /** "Hôm qua 15:40 · Số điện thoại, địa chỉ". */
  caption: string;
  unread: boolean;
  /** Read out for the dot: "Chưa đọc". */
  unreadLabel: string;
  href: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
};

const TONE: Record<NotificationTone, string> = {
  warning: 'bg-warning-soft text-warning',
  success: 'bg-brand-teal-soft text-success',
  danger: 'bg-surface text-danger ring-1 ring-line',
  info: 'bg-info text-brand-blue',
};

export function NotificationItem({ avatarName, tone, icon, text, caption, unread, unreadLabel, href, onClick }: NotificationItemProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="grid grid-cols-[32px_minmax(0,1fr)_8px] items-start gap-x-3 rounded-sm px-3 py-2.5 text-[14px] leading-5 text-ink no-underline hover:bg-surface-muted"
    >
      <span className="relative">
        {avatarName ? <Avatar name={avatarName} size="md" /> : <span className="block size-8 rounded-full bg-surface-muted" aria-hidden="true" />}
        <span
          aria-hidden="true"
          className={cn('absolute -right-0.75 -bottom-0.75 grid size-4 place-items-center rounded-full border-2 border-surface [&_svg]:size-2.5 [&_svg]:stroke-2', TONE[tone])}
        >
          {icon}
        </span>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn('[overflow-wrap:anywhere]', !unread && 'text-ink-muted [&_b]:text-ink')}>{text}</span>
        <span className="text-caption text-ink-muted">{caption}</span>
      </span>
      {unread ? (
        <span className="mt-1.5 size-2 rounded-full bg-brand-blue" role="img" aria-label={unreadLabel} />
      ) : (
        <span />
      )}
    </a>
  );
}
