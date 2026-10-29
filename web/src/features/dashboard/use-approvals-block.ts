// The "Chờ bạn duyệt" block: quick approve and reject on the rows. A decided row turns into its result for 4 seconds,
// then leaves, the count drops and the block reloads; a request someone else decided meanwhile leaves with a notice.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApprovalRowResult } from '@/components/ui/approval-row';
import { useToast } from '@/components/ui/use-toast';
import type { ApprovalRequestDetail } from '@/features/approval/api';
import { approverLabel } from '@/features/approval/approver-label';
import { ApiError } from '@/lib/api';
import { DASHBOARD_APPROVALS_KEY, useDashboardApprovals, useQuickDecision, type DashboardApprovalItem } from './approvals-api';

export const RESULT_MS = 4000;
const HANDLED_CODES = ['approval.already_handled', 'approval.not_approver', 'approval.not_found'];

export function useApprovalsBlock() {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useDashboardApprovals();
  const decide = useQuickDecision();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ApprovalRowResult>>({});
  const [left, setLeft] = useState<ReadonlySet<string>>(new Set());
  const [handled, setHandled] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<DashboardApprovalItem | null>(null);
  const block = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  // A fresh list already leaves out what was decided.
  useEffect(() => setLeft(new Set()), [query.dataUpdatedAt]);

  const total = query.data?.total ?? 0;
  const rows = (query.data?.items ?? []).filter((item) => !left.has(item.request.id));
  const typeOf = (item: DashboardApprovalItem) => t(`approvals.type.${item.request.type}`).toLocaleLowerCase();

  const describe = (item: DashboardApprovalItem, kind: 'approve' | 'reject', after: ApprovalRequestDetail) => {
    const { level } = item.request;
    const values = { type: typeOf(item), name: item.request.sender.fullName, level };
    if (kind === 'reject') {
      return {
        row: { kind: 'rejected', text: t('dashboard.approvals.result.rejected', values), detail: t('dashboard.approvals.result.rejectedDetail'), badge: t('dashboard.approvals.result.badge.rejected') } as const,
        toast: t('dashboard.approvals.toast.rejected', values),
      };
    }
    if (after.status === 'APPROVED') {
      return { row: { kind: 'approved', text: t('dashboard.approvals.result.approved', values), badge: t('dashboard.approvals.result.badge.approved') } as const, toast: t('dashboard.approvals.toast.approved', values) };
    }
    const step = after.steps[after.level - 1];
    const moved = { ...values, next: after.level, approver: step ? approverLabel(t, step.rule, step.role) : '' };
    return {
      row: { kind: 'moved', text: t('dashboard.approvals.result.moved', moved), detail: t('dashboard.approvals.result.movedDetail', moved), badge: t('dashboard.approvals.result.badge.moved', moved) } as const,
      toast: t('dashboard.approvals.toast.moved', moved),
    };
  };

  // After a row has gone, focus moves to the Duyệt of the next one, or to the block heading; never to the page top.
  const moveFocus = () =>
    window.setTimeout(() => {
      const active = document.activeElement;
      if (active && active !== document.body && !block.current?.contains(active)) return;
      (block.current?.querySelector<HTMLElement>('[data-approve]:not(:disabled)') ?? heading.current)?.focus();
    }, 0);

  const leave = (id: string) => {
    setResults(({ [id]: _gone, ...rest }) => rest);
    setLeft((current) => new Set(current).add(id));
    void queryClient.invalidateQueries({ queryKey: DASHBOARD_APPROVALS_KEY });
    timers.current.push(moveFocus());
  };

  const run = (item: DashboardApprovalItem, kind: 'approve' | 'reject', comment?: string) => {
    const id = item.request.id;
    setBusyId(id);
    setHandled(null);
    decide.mutate(
      { id, decision: kind, comment },
      {
        onSuccess: (after) => {
          const outcome = describe(item, kind, after);
          setResults((current) => ({ ...current, [id]: outcome.row }));
          toast({ variant: 'success', message: outcome.toast });
          timers.current.push(window.setTimeout(() => leave(id), RESULT_MS));
        },
        onError: (error) => {
          if (error instanceof ApiError && HANDLED_CODES.includes(error.code)) {
            setHandled(t('dashboard.approvals.handled', { name: item.request.sender.fullName }));
            leave(id);
            return;
          }
          toast({ variant: 'danger', message: t('dashboard.approvals.toast.failed') });
        },
        onSettled: () => setBusyId(null),
      },
    );
  };

  return {
    query,
    rows,
    count: Math.max(0, total - left.size),
    results,
    busyId,
    handled,
    block,
    heading,
    rejecting,
    askReject: setRejecting,
    cancelReject: () => setRejecting(null),
    approve: (item: DashboardApprovalItem) => run(item, 'approve'),
    reject: (reason: string) => {
      if (!rejecting) return;
      run(rejecting, 'reject', reason);
      setRejecting(null);
    },
    typeOf,
  };
}
