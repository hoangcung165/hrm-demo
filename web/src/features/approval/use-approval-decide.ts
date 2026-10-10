// Duyệt, Trả về and Từ chối from the detail page: the reason dialog, the Toasts, and what comes next. After Duyệt the
// next waiting request opens (or the inbox, when none is left); after a reason the page stays and shows the outcome.
// When someone acted first (409, or the caller is no longer an approver), the page reloads the request and says so.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useToast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/api';
import { useApprovalDecision, type ApprovalDecision, type ApprovalRequestDetail } from './api';
import { approverLabel } from './approver-label';
import type { WaitingNeighbours } from './use-waiting-neighbours';

const HANDLED_CODES = ['approval.already_handled', 'approval.not_approver', 'approval.not_found'];

export function useApprovalDecide(request: ApprovalRequestDetail, neighbours: WaitingNeighbours | null, onHandled: () => void) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const decision = useApprovalDecision(request.id);
  const [dialog, setDialog] = useState<'reject' | 'return' | null>(null);
  const [note, setNote] = useState('');
  const [handled, setHandled] = useState(false);
  const name = request.sender.fullName;

  const run = (kind: ApprovalDecision, comment: string) =>
    decision.mutate(
      { decision: kind, comment },
      {
        onSuccess: (after) => {
          setDialog(null);
          setNote('');
          if (kind !== 'approve') {
            toast({ variant: 'success', message: t(kind === 'reject' ? 'approvals.detail.toast.rejected' : 'approvals.detail.toast.returned', { name }) });
            return;
          }
          const next = neighbours?.next ?? neighbours?.previous ?? null;
          const step = after.steps[after.level - 1];
          const details =
            after.status === 'APPROVED'
              ? [request.type === 'PROFILE_UPDATE' ? t('approvals.detail.toast.appliedProfile') : '']
              : [step ? t('approvals.detail.toast.movedTo', { level: step.level, approver: approverLabel(t, step.rule, step.role) }) : ''];
          if (next) details.push(t('approvals.detail.toast.openingNext'));
          toast({
            variant: 'success',
            message: after.status === 'APPROVED' ? t('approvals.detail.toast.approvedFinal', { name }) : t('approvals.detail.toast.approvedLevel', { level: request.level, name }),
            detail: details.filter(Boolean).join(' ') || undefined,
          });
          navigate(next ? `/approvals/${next.id}` : '/approvals');
        },
        onError: (error) => {
          if (error instanceof ApiError && HANDLED_CODES.includes(error.code)) {
            setDialog(null);
            setHandled(true);
            onHandled();
            return;
          }
          toast({ variant: 'danger', message: t('approvals.detail.toast.failed') });
        },
      },
    );

  return {
    note,
    setNote,
    dialog,
    openDialog: setDialog,
    closeDialog: () => setDialog(null),
    approve: () => run('approve', note),
    /** With the reason from the dialog. */
    confirm: (reason: string) => dialog && run(dialog, reason),
    pending: decision.isPending,
    /** Someone acted first: the decision card gives way to an alert. */
    handled,
  };
}

export type ApprovalDecide = ReturnType<typeof useApprovalDecide>;
