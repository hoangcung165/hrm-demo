// Approvals API (Luồng duyệt, HRM-12). Contract: "## API contract" comments on issue #14 (BE-3, BE-8, BE-4).
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@/features/auth/account';
import { api } from '@/lib/api';

export const APPROVAL_REQUEST_TYPES = ['PROFILE_UPDATE', 'LEAVE', 'OVERTIME', 'ATTENDANCE_ADJUSTMENT', 'TIMESHEET', 'PAYROLL'] as const;
export type ApprovalRequestType = (typeof APPROVAL_REQUEST_TYPES)[number];

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_INFO' | 'CANCELLED';
export type ApproverRule = 'LINE_MANAGER' | 'PROJECT_MANAGER' | 'ROLE';

/** The tabs of the Hộp thư duyệt, as the API's `box`. Ủy quyền duyệt is its own tab (FE-5). */
export const APPROVAL_BOXES = ['WAITING', 'SENT', 'HANDLED'] as const;
export type ApprovalBox = (typeof APPROVAL_BOXES)[number];

/** Mirrors the backend record `EmployeeCard`: "NV00021 · Nhóm Web". */
export type EmployeeCard = { id: string; code: string; fullName: string; orgUnitName: string | null };

/** Mirrors the backend record `ApprovalInboxItem`. Times are ISO instants. */
export type ApprovalInboxItem = {
  id: string;
  type: ApprovalRequestType;
  status: ApprovalStatus;
  level: number;
  levelCount: number;
  rule: ApproverRule;
  role: Role | null;
  summary: string;
  sender: EmployeeCard;
  sentAt: string;
  autoApproveDueAt: string | null;
  /** WAITING only: the approver the caller stands in for ("Duyệt thay …"). */
  onBehalfOf: EmployeeCard | null;
  /** The sender sent it again after a return ("Đã bổ sung, gửi lại"). */
  resubmitted: boolean;
  updatedAt: string;
};

export type ApprovalInboxPage = { items: ApprovalInboxItem[]; total: number };

/** Mirrors the backend record `ApprovalInboxCounts`. */
export type ApprovalInboxCounts = { waiting: number; sent: number };

export type ApprovalDelegationStatus = 'UPCOMING' | 'ACTIVE' | 'ENDED';

/** Mirrors the backend record `ApprovalDelegationResponse`. Dates are ISO dates, both ends included. */
export type ApprovalDelegation = {
  id: string;
  delegator: EmployeeCard;
  delegate: EmployeeCard;
  startDate: string;
  endDate: string;
  requestTypes: ApprovalRequestType[];
  status: ApprovalDelegationStatus;
  endedAt: string | null;
};

export type ApprovalDelegations = { given: ApprovalDelegation[]; received: ApprovalDelegation[] };

export const APPROVAL_PAGE_SIZE = 20;

/** WAITING only: the caller's own requests, the ones approved on behalf of a delegator, or both (`''`). */
export type ApprovalOnBehalf = '' | 'MINE' | 'BEHALF';

/** `''` means no filter. `page` counts from 0, as the API does. */
export type ApprovalInboxQuery = { box: ApprovalBox; page: number; q: string; type: ApprovalRequestType | ''; onBehalf?: ApprovalOnBehalf };

export const APPROVALS_KEY = ['approvals'] as const;

export function approvalInboxPath({ box, page, q, type, onBehalf = '' }: ApprovalInboxQuery): string {
  const search = new URLSearchParams({ box, page: String(page), size: String(APPROVAL_PAGE_SIZE) });
  if (q) search.set('q', q);
  if (type) search.set('type', type);
  if (box === 'WAITING' && onBehalf) search.set('onBehalf', String(onBehalf === 'BEHALF'));
  return `/api/approvals?${search}`;
}

/**
 * One page of one tab. Within a tab the rows of the previous query stay while the next one loads; another tab starts
 * from Skeleton rows, since its columns differ.
 */
export function useApprovalInbox(query: ApprovalInboxQuery) {
  return useQuery({
    queryKey: [...APPROVALS_KEY, 'inbox', query] as const,
    queryFn: async () => ({ ...(await api<ApprovalInboxPage>(approvalInboxPath(query))), pageIndex: query.page }),
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2].box === query.box ? keepPreviousData(previous) : undefined),
  });
}

/** The counts on the tabs and the sidebar item; only for an Account linked to an Employee. */
export function useApprovalCounts(enabled: boolean) {
  return useQuery({
    queryKey: [...APPROVALS_KEY, 'counts'],
    queryFn: () => api<ApprovalInboxCounts>('/api/approvals/counts'),
    enabled,
    refetchInterval: 60_000,
  });
}

export const DELEGATIONS_KEY = [...APPROVALS_KEY, 'delegations'] as const;

/** The caller's delegations to others and from others (tab "Ủy quyền duyệt", and the inbox banner). */
export function useApprovalDelegations() {
  return useQuery({
    queryKey: DELEGATIONS_KEY,
    queryFn: () => api<ApprovalDelegations>('/api/approval-delegations'),
  });
}

export type ApprovalStepState = 'DONE' | 'WAITING' | 'RETURNED' | 'REJECTED' | 'CANCELLED' | 'NOT_REACHED';

/** Mirrors the backend record `ApprovalStepResponse`: one level of the request. */
export type ApprovalStep = {
  level: number;
  rule: ApproverRule;
  role: Role | null;
  state: ApprovalStepState;
  /** WAITING only: who may approve it now. */
  approvers: EmployeeCard[];
  /** It went up past its own rule (Tự đẩy lên cấp trên). */
  escalated: boolean;
  decidedBy: EmployeeCard | null;
  onBehalfOf: EmployeeCard | null;
  decidedAt: string | null;
  comment: string | null;
  autoApproved: boolean;
};

export type ApprovalLogEvent =
  | 'SUBMITTED'
  | 'LEVEL_REACHED'
  | 'ESCALATED'
  | 'LEVEL_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'RESUBMITTED'
  | 'CANCELLED'
  | 'AUTO_APPROVED';

/** Mirrors the backend record `ApprovalLogEntryResponse`: one line of the Nhật ký, oldest first. `actor` null: the system. */
export type ApprovalLogEntry = {
  event: ApprovalLogEvent;
  level: number;
  actor: EmployeeCard | null;
  onBehalfOf: EmployeeCard | null;
  comment: string | null;
  escalatedTo: 'SENDER_LINE_MANAGER' | 'PARENT_UNIT_HEAD' | 'HR_ROLE' | null;
  at: string;
};

/** Mirrors the backend record `ApprovalAllowedActions`; the API checks again on every action. */
export type ApprovalAllowedActions = { decide: boolean; onBehalfOf: EmployeeCard | null; resubmit: boolean; cancel: boolean };

/** Mirrors the backend record `ApprovalRequestResponse`. */
export type ApprovalRequestDetail = {
  id: string;
  type: ApprovalRequestType;
  status: ApprovalStatus;
  level: number;
  levelCount: number;
  summary: string;
  sender: EmployeeCard;
  sentAt: string;
  autoApproveDays: number | null;
  autoApproveDueAt: string | null;
  steps: ApprovalStep[];
  log: ApprovalLogEntry[];
  allowed: ApprovalAllowedActions;
};

export const approvalRequestKey = (id: string) => [...APPROVALS_KEY, 'request', id] as const;

/** One request, for the people involved; 404 `approval.not_found` for everyone else. */
export function useApprovalRequest(id: string) {
  return useQuery({
    queryKey: approvalRequestKey(id),
    queryFn: () => api<ApprovalRequestDetail>(`/api/approvals/${id}`),
  });
}

export type ApprovalDecision = 'approve' | 'reject' | 'return';

/**
 * Duyệt, Từ chối or Trả về để bổ sung; the comment is optional on approve and required (the reason) otherwise. On
 * success every approvals query is refreshed: the inbox, the counts and this request.
 */
export function useApprovalDecision(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ decision, comment }: { decision: ApprovalDecision; comment: string }) =>
      api<ApprovalRequestDetail>(`/api/approvals/${id}/${decision}`, { method: 'POST', body: comment.trim() ? { comment: comment.trim() } : {} }),
    onSuccess: (detail) => {
      queryClient.setQueryData(approvalRequestKey(id), detail);
      void queryClient.invalidateQueries({ queryKey: APPROVALS_KEY, predicate: (query) => query.queryKey[1] !== 'request' || query.queryKey[2] !== id });
    },
  });
}
