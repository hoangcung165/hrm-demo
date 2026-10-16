// The status of a Đơn nghỉ as a Badge, always in words: Chờ duyệt, Cần bổ sung, Đã duyệt, Từ chối, Đã hủy.
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { LeaveRequestStatus } from '../api';

const VARIANT: Record<LeaveRequestStatus, BadgeProps['variant']> = {
  PENDING: 'warning',
  RETURNED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

export type LeaveStatusBadgeProps = { status: LeaveRequestStatus };

export function LeaveStatusBadge({ status }: LeaveStatusBadgeProps) {
  const { t } = useTranslation();
  return <Badge variant={VARIANT[status]}>{t(`leave.status.${status}`)}</Badge>;
}
