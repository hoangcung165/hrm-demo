// "Chờ bạn duyệt" API (HRM-20/BE-2). Contract: "## API contract: dashboard pending approvals" on issue #22.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { APPROVALS_KEY, type ApprovalInboxItem, type ApprovalRequestDetail } from '@/features/approval/api';
import { api } from '@/lib/api';
import { DASHBOARD_KEY } from './api';

/** Mirrors `ApprovalWarning`: why the approver should open the request first. `details` carries numbers as strings. */
export type ApprovalWarning = { code: 'leave.advance' | 'leave.over_balance' | 'leave.attachment'; details: Record<string, string | number> };

/** Mirrors `DashboardApprovalItem`: a request as the inbox shows it, and whether one click may decide it. */
export type DashboardApprovalItem = { request: ApprovalInboxItem; warnings: ApprovalWarning[]; quickApprovable: boolean };

/** Mirrors `DashboardApprovalsResponse`: the first rows in the inbox's order, and every request waiting for the caller. */
export type DashboardApprovals = { items: DashboardApprovalItem[]; total: number };

export const DASHBOARD_APPROVALS_LIMIT = 5;
export const DASHBOARD_APPROVALS_KEY = [...DASHBOARD_KEY, 'approvals'] as const;

export function useDashboardApprovals(enabled = true) {
  return useQuery({
    queryKey: DASHBOARD_APPROVALS_KEY,
    queryFn: () => api<DashboardApprovals>(`/api/dashboard/approvals?limit=${DASHBOARD_APPROVALS_LIMIT}`),
    enabled,
  });
}

export type QuickDecision = { id: string; decision: 'approve' | 'reject'; comment?: string };

/**
 * Duyệt or Từ chối from the block: the inbox's own endpoints, so levels, notifications and the log are the same. The
 * inbox and the counts refresh at once; this block's own list waits until the result row has left.
 */
export function useQuickDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, comment }: QuickDecision) =>
      api<ApprovalRequestDetail>(`/api/approvals/${id}/${decision}`, { method: 'POST', body: comment ? { comment } : {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: APPROVALS_KEY }),
  });
}
