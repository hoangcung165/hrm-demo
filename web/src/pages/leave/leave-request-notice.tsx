// What happened to a request that its status alone does not say: returned with the approver's reason (to change it),
// rejected with the reason, cancelled after approval with the days given back.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import type { LeaveRequestDetail } from '@/features/leave/api';
import { formatDays } from '@/features/leave/leave-format';
import { formatDate } from '@/lib/format';

export type LeaveRequestNoticeProps = { request: LeaveRequestDetail };

export function LeaveRequestNotice({ request }: LeaveRequestNoticeProps) {
  const { t } = useTranslation();
  const stopped = request.approval?.steps.find((step) => step.state === 'RETURNED' || step.state === 'REJECTED');
  if (request.status === 'RETURNED' && stopped) {
    return (
      <Alert variant="warning" title={t('leave.detail.returned', { name: stopped.decidedBy?.fullName ?? '' })}>
        {stopped.comment}
      </Alert>
    );
  }
  if (request.status === 'REJECTED' && stopped) {
    return (
      <Alert variant="danger" title={t('leave.detail.rejected', { name: stopped.decidedBy?.fullName ?? '' })}>
        {stopped.comment}
      </Alert>
    );
  }
  if (request.status === 'CANCELLED' && request.cancelledAt && request.approval?.status === 'APPROVED') {
    return <Alert variant="info" title={t('leave.detail.cancelledApproved', { date: formatDate(request.cancelledAt), days: formatDays(request.days) })} />;
  }
  return null;
}
