// What the page says instead of the decision card when the caller cannot decide: someone acted first, the caller only
// views it (an earlier approver, the sender while it waits), or, for the sender, why it came back or ended.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { formatTime } from '@/lib/format';
import type { ApprovalLogEntry, ApprovalRequestDetail } from '../api';
import { approverLabel } from '../approver-label';

const DECISIONS = ['LEVEL_APPROVED', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED', 'AUTO_APPROVED'];

const lastDecision = (log: ApprovalLogEntry[]) => [...log].reverse().find((entry) => DECISIONS.includes(entry.event) && (entry.actor || entry.event === 'AUTO_APPROVED'));

export type ApprovalStateAlertProps = {
  request: ApprovalRequestDetail;
  /** The caller's own action was refused because someone acted first. */
  handled: boolean;
  /** The caller sent it. */
  sender: boolean;
};

export function ApprovalStateAlert({ request, handled, sender }: ApprovalStateAlertProps) {
  const { t } = useTranslation();
  const step = request.steps[request.level - 1];
  if (handled) {
    const last = lastDecision(request.log);
    return (
      <Alert variant="warning" title={t('approvals.detail.handled.title')}>
        {last
          ? t('approvals.detail.handled.text', {
              name: last.actor?.fullName ?? t('approvals.detail.log.system'),
              action: t(`approvals.detail.handled.action.${last.event}`),
              at: formatTime(last.at),
            })
          : t('approvals.detail.handled.textNoName')}
      </Alert>
    );
  }
  if (sender && step && (request.status === 'RETURNED_FOR_INFO' || request.status === 'REJECTED')) {
    const by = step.decidedBy?.fullName ?? '';
    const returned = request.status === 'RETURNED_FOR_INFO';
    return (
      <Alert variant={returned ? 'warning' : 'danger'} title={t(returned ? 'approvals.detail.sender.returned' : 'approvals.detail.sender.rejected', { name: by })}>
        {step.comment ? <span className="block text-ink [overflow-wrap:anywhere]">{step.comment}</span> : null}
        {t(returned ? 'approvals.detail.sender.returnedFoot' : 'approvals.detail.sender.rejectedHint', { level: request.level })}
      </Alert>
    );
  }
  if (request.status === 'PENDING' && step) {
    return (
      <Alert variant="info" title={t('approvals.detail.readOnly.title')}>
        {t('approvals.detail.readOnly.waiting', { approver: approverLabel(t, step.rule, step.role), level: request.level })}
      </Alert>
    );
  }
  return null;
}
