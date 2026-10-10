// One notification as a bell row: the sentence for its kind with the person in bold, when it came, what it is about,
// and where it leads (the request, or the inbox for a delegation).
import { Check, Clock, CornerUpLeft, RefreshCw, UserCheck, X } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { NotificationItem, type NotificationTone } from '@/components/ui/notification-item';
import { formatRelativeTime } from '@/lib/format';
import type { NotificationItem as Notification, NotificationKind } from '../api';

const LOOK: Record<NotificationKind, { tone: NotificationTone; icon: ReactNode }> = {
  APPROVAL_WAITING: { tone: 'warning', icon: <Clock /> },
  APPROVAL_RESUBMITTED: { tone: 'warning', icon: <RefreshCw /> },
  APPROVAL_APPROVED: { tone: 'success', icon: <Check /> },
  APPROVAL_REJECTED: { tone: 'danger', icon: <X /> },
  APPROVAL_RETURNED: { tone: 'warning', icon: <CornerUpLeft /> },
  DELEGATION_RECEIVED: { tone: 'info', icon: <UserCheck /> },
};

/** Where the row leads. */
export const notificationHref = (item: Notification) => (item.requestId ? `/approvals/${item.requestId}` : '/approvals?box=delegations');

export type NotificationLineProps = {
  item: Notification;
  onOpen: (item: Notification) => void;
};

export function NotificationLine({ item, onOpen }: NotificationLineProps) {
  const { t } = useTranslation();
  const system = item.kind === 'APPROVAL_APPROVED' && !item.actor;
  const key = system ? 'notifications.kind.APPROVAL_APPROVED_system' : `notifications.kind.${item.kind}`;
  const values = {
    actor: item.actor?.fullName ?? '',
    type: item.requestType ? t(`notifications.type.${item.requestType}`) : '',
    typeTitle: item.requestType ? t(`approvals.type.${item.requestType}`) : '',
  };
  const caption = [formatRelativeTime(item.createdAt), item.summary, item.onBehalfOf ? t('notifications.onBehalfOf', { name: item.onBehalfOf.fullName }) : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <NotificationItem
      avatarName={item.actor?.fullName ?? null}
      tone={LOOK[item.kind].tone}
      icon={LOOK[item.kind].icon}
      text={<Trans i18nKey={key} values={values} components={{ b: <b className="font-semibold" /> }} />}
      caption={caption}
      unread={!item.read}
      unreadLabel={t('notifications.unread')}
      href={notificationHref(item)}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onOpen(item);
      }}
    />
  );
}
