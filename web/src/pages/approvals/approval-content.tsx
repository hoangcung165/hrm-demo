// What the request asks for, by type: the proposed changes of a profile update, the days and balance of a leave
// request; for the types whose screens come later (overtime…), the summary the sender's feature wrote.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { LeaveApprovalContent } from '@/features/leave/components/leave-approval-content';
import { ProfileUpdateChanges } from '@/features/profile-update/components/profile-update-changes';
import type { ApprovalRequestDetail } from '@/features/approval/api';

export type ApprovalContentProps = {
  request: ApprovalRequestDetail;
  compact: boolean;
};

export function ApprovalContent({ request, compact }: ApprovalContentProps) {
  const { t } = useTranslation();
  if (request.type === 'PROFILE_UPDATE') {
    return <ProfileUpdateChanges requestId={request.id} senderName={request.sender.fullName} applied={request.status === 'APPROVED'} compact={compact} />;
  }
  if (request.type === 'LEAVE') return <LeaveApprovalContent requestId={request.id} version={`${request.status}-${request.level}`} summary={request.summary} />;
  return (
    <Card title={t('approvals.detail.content.title')}>
      <p className="[overflow-wrap:anywhere]">{request.summary}</p>
    </Card>
  );
}
