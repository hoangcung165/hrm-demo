// "Các bước duyệt" of a request (P7): "Đã gửi", each level with its outcome, who decided and when, and the last step
// of the type: "Áp dụng vào hồ sơ" for a profile update, "Trừ vào số dư" for a leave request.
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ApprovalSteps, type ApprovalStepItem, type ApprovalStepState } from '@/components/ui/approval-steps';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/format';
import type { ApprovalRequestDetail, ApprovalStep } from '../api';
import { approverLabel } from '../approver-label';

const STATE: Record<ApprovalStep['state'], ApprovalStepState> = {
  DONE: 'done',
  WAITING: 'current',
  RETURNED: 'stopped',
  REJECTED: 'stopped',
  CANCELLED: 'stopped',
  NOT_REACHED: 'pending',
};
const BADGE: Record<ApprovalStep['state'], BadgeProps['variant']> = {
  DONE: 'success',
  WAITING: 'warning',
  RETURNED: 'warning',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
  NOT_REACHED: undefined,
};

function levelItem(t: TFunction, step: ApprovalStep, request: ApprovalRequestDetail, me: string | null): ApprovalStepItem {
  const captions: string[] = [];
  if (step.state === 'WAITING') {
    const names = step.approvers.map((a) => (a.id === me ? t('approvals.detail.steps.you') : a.fullName));
    if (names.length) captions.push(t('approvals.detail.steps.approvers', { names: names.join(', ') }));
    if (request.autoApproveDueAt) captions.push(t('approvals.detail.steps.autoOn', { at: formatDateTime(request.autoApproveDueAt) }));
  } else if (step.decidedAt) {
    const at = formatDateTime(step.decidedAt);
    if (step.autoApproved || !step.decidedBy) captions.push(t('approvals.detail.steps.system', { at }));
    else if (step.onBehalfOf) captions.push(t('approvals.detail.steps.decidedOnBehalf', { name: step.decidedBy.fullName, behalf: step.onBehalfOf.fullName, at }));
    else captions.push(t('approvals.detail.steps.decidedBy', { name: step.decidedBy.fullName, at }));
  }
  const badgeKey = step.state === 'DONE' && step.autoApproved ? 'AUTO' : step.state;
  return {
    id: `level-${step.level}`,
    title: t('approvals.detail.steps.level', { level: step.level, approver: approverLabel(t, step.rule, step.role) }),
    state: STATE[step.state],
    badge:
      step.state === 'NOT_REACHED' ? undefined : (
        <span className="flex flex-wrap gap-1">
          <Badge variant={BADGE[step.state]}>{t(`approvals.detail.steps.badge.${badgeKey}`)}</Badge>
          {step.escalated ? <Badge variant="info">{t('approvals.detail.steps.escalated')}</Badge> : null}
        </span>
      ),
    captions,
    quote: step.comment,
  };
}

export type ApprovalStepListProps = {
  request: ApprovalRequestDetail;
  /** The caller's Employee, named "bạn" among the approvers. */
  me: string | null;
};

export function ApprovalStepList({ request, me }: ApprovalStepListProps) {
  const { t } = useTranslation();
  const steps: ApprovalStepItem[] = [
    { id: 'sent', title: t('approvals.detail.steps.sent'), state: 'done', captions: [`${request.sender.fullName} · ${formatDateTime(request.sentAt)}`] },
    ...request.steps.map((step) => levelItem(t, step, request, me)),
  ];
  if (request.type === 'PROFILE_UPDATE') {
    const applied = request.status === 'APPROVED';
    steps.push({
      id: 'apply',
      title: t('approvals.detail.steps.apply'),
      state: applied ? 'done' : 'pending',
      captions: [t(applied ? 'approvals.detail.steps.applyDone' : 'approvals.detail.steps.applyPending')],
    });
  }
  if (request.type === 'LEAVE') {
    const approved = request.status === 'APPROVED';
    steps.push({
      id: 'balance',
      title: t('approvals.detail.steps.leaveBalance'),
      state: approved ? 'done' : 'pending',
      captions: [t(approved ? 'approvals.detail.steps.leaveBalanceDone' : 'approvals.detail.steps.leaveBalancePending')],
    });
  }
  return <ApprovalSteps label={t('approvals.detail.steps.title')} steps={steps} />;
}
