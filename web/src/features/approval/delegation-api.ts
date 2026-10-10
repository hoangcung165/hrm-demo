// Ủy quyền duyệt (HRM-12/BE-4): create one, end one early, cancel one that has not started, and the people the caller
// may delegate to. Contract: "## API contract" comment on issue #14 (BE-4). Any Account linked to an Employee.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { APPROVALS_KEY, type ApprovalDelegation, type ApprovalRequestType, type EmployeeCard } from './api';

/** Every type but payroll, which is never delegated. */
export const DELEGABLE_TYPES: ApprovalRequestType[] = ['PROFILE_UPDATE', 'LEAVE', 'OVERTIME', 'ATTENDANCE_ADJUSTMENT', 'TIMESHEET'];

/** Mirrors the backend record `ApprovalDelegationRequest`; dates are ISO dates, both included. */
export type ApprovalDelegationInput = { delegateId: string; startDate: string; endDate: string; requestTypes: ApprovalRequestType[] };

/** Active Employees but the caller, by name or code (at most 20); loaded once the picker is first opened. */
export function useDelegateCandidates(q: string, enabled: boolean) {
  return useQuery({
    queryKey: [...APPROVALS_KEY, 'delegate-candidates', q],
    queryFn: () => api<EmployeeCard[]>(`/api/approval-delegations/candidates${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    enabled,
  });
}

/** Creating, ending or cancelling one refreshes the delegations, the inbox and the counts (who sees what changes). */
export function useDelegationActions() {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: APPROVALS_KEY });
  const create = useMutation({
    mutationFn: (input: ApprovalDelegationInput) => api<ApprovalDelegation>('/api/approval-delegations', { method: 'POST', body: input }),
    onSuccess: refresh,
  });
  const end = useMutation({
    mutationFn: (id: string) => api<ApprovalDelegation>(`/api/approval-delegations/${id}/end`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api<void>(`/api/approval-delegations/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
  return { create, end, cancel };
}
