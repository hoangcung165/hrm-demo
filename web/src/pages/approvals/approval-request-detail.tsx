// A loaded request: the head, what it asks for, the steps and the log, and the decision card for an approver of the
// waiting level (a pinned action bar at 390). Anyone else involved gets a read-only view with the reason.
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { approvalRequestKey, type ApprovalRequestDetail } from '@/features/approval/api';
import { ApprovalActionBar } from '@/features/approval/components/approval-action-bar';
import { ApprovalDecisionCard } from '@/features/approval/components/approval-decision-card';
import { ApprovalLog } from '@/features/approval/components/approval-log';
import { ApprovalReasonDialog } from '@/features/approval/components/approval-reason-dialog';
import { ApprovalRequestHead } from '@/features/approval/components/approval-request-head';
import { ApprovalStateAlert } from '@/features/approval/components/approval-state-alert';
import { ApprovalStepList } from '@/features/approval/components/approval-step-list';
import { useApprovalDecide } from '@/features/approval/use-approval-decide';
import { useWaitingNeighbours } from '@/features/approval/use-waiting-neighbours';
import { useCurrentAccount } from '@/features/auth/account-context';
import { ApprovalContent } from './approval-content';

export type ApprovalRequestDetailViewProps = {
  request: ApprovalRequestDetail;
  compact: boolean;
};

export function ApprovalRequestDetailView({ request, compact }: ApprovalRequestDetailViewProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { employeeId } = useCurrentAccount();
  const neighbours = useWaitingNeighbours(request.id);
  const decide = useApprovalDecide(request, neighbours, () => void queryClient.invalidateQueries({ queryKey: approvalRequestKey(request.id) }));
  const canDecide = request.allowed.decide && !decide.handled;
  const sender = request.sender.id === employeeId;
  const alert = canDecide ? null : <ApprovalStateAlert request={request} handled={decide.handled} sender={sender} />;
  const steps = (
    <Card title={t('approvals.detail.steps.title')} description={t('approvals.detail.steps.flow', { type: t(`approvals.type.${request.type}`), count: request.levelCount })}>
      <ApprovalStepList request={request} me={employeeId} />
    </Card>
  );
  const log = (
    <Card title={t('approvals.detail.log.title')}>
      <ApprovalLog request={request} />
    </Card>
  );
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ApprovalRequestHead request={request} neighbours={neighbours} compact={compact} />
      {compact ? (
        <>
          {alert}
          <ApprovalContent request={request} compact />
          {steps}
          {log}
          {canDecide ? <ApprovalActionBar decide={decide} /> : null}
        </>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 min-[1440px]:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-6">
            <ApprovalContent request={request} compact={false} />
            {log}
          </div>
          <div className="flex flex-col gap-6">
            {canDecide ? <ApprovalDecisionCard request={request} decide={decide} /> : alert}
            {steps}
          </div>
        </div>
      )}
      <ApprovalReasonDialog kind={decide.dialog} request={request} pending={decide.pending} onConfirm={decide.confirm} onCancel={decide.closeDialog} />
    </div>
  );
}
