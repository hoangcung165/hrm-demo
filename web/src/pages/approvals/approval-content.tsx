// What the request asks for, by type: the proposed changes of a profile update; for the types whose screens come
// later (leave, overtime…), the summary the sender's feature wrote.
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
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
  return (
    <Card title={t('approvals.detail.content.title')}>
      <p className="[overflow-wrap:anywhere]">{request.summary}</p>
    </Card>
  );
}
