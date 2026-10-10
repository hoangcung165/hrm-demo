// The status of a Yêu cầu phê duyệt as a Badge with its text (pattern P7).
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { ApprovalStatus } from '../api';

const VARIANT: Record<ApprovalStatus, BadgeProps['variant']> = {
  PENDING: 'info',
  APPROVED: 'success',
  REJECTED: 'danger',
  RETURNED_FOR_INFO: 'warning',
  CANCELLED: 'neutral',
};

export type ApprovalStatusBadgeProps = { status: ApprovalStatus };

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={VARIANT[status]} className="whitespace-nowrap">
      {t(`approvals.status.${status}`)}
    </Badge>
  );
}
