// Approval flows API (Luồng phê duyệt, HRM-12/BE-2). Contract: "## API contract" comment on issue #14 (BE-2).
// Reading and saving need APPROVAL_FLOW_EDIT.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@/features/auth/account';
import { api } from '@/lib/api';
import type { ApprovalRequestType, ApproverRule } from './api';

export const MAX_LEVELS = 3;
export const MAX_AUTO_APPROVE_DAYS = 30;

/** Mirrors the backend record `ApprovalFlowLevelDto`. `role` only for a ROLE level. */
export type ApprovalFlowLevel = { rule: ApproverRule; role: Role | null };

/** Mirrors the backend record `ApprovalFlowResponse`. */
export type ApprovalFlow = {
  requestType: ApprovalRequestType;
  levels: ApprovalFlowLevel[];
  /** Null: never. */
  autoApproveDays: number | null;
  delegationAllowed: boolean;
  /** False for payroll: auto-approve and delegation are locked off. */
  automationAllowed: boolean;
  customized: boolean;
  updatedAt: string | null;
};

/** Mirrors the backend record `ApprovalFlowRequest`. */
export type ApprovalFlowInput = Pick<ApprovalFlow, 'levels' | 'autoApproveDays' | 'delegationAllowed'>;

const FLOWS_KEY = ['approval-flows'] as const;

export function useApprovalFlows(enabled: boolean) {
  return useQuery({
    queryKey: FLOWS_KEY,
    queryFn: async () => (await api<{ items: ApprovalFlow[] }>('/api/approval-flows')).items,
    enabled,
  });
}

/** Saves the whole flow of one type; requests already sent keep theirs. */
export function useSaveApprovalFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, input }: { type: ApprovalRequestType; input: ApprovalFlowInput }) =>
      api<ApprovalFlow>(`/api/approval-flows/${type}`, { method: 'PUT', body: input }),
    onSuccess: (saved) => {
      queryClient.setQueryData<ApprovalFlow[]>(FLOWS_KEY, (flows) => flows?.map((flow) => (flow.requestType === saved.requestType ? saved : flow)));
    },
  });
}
