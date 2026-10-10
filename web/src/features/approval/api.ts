// Approvals API (Luồng duyệt, HRM-12). Contract: "## API contract" comments on issue #14 (BE-3, BE-8, BE-4).
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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

/** `''` means no filter. `page` counts from 0, as the API does. */
export type ApprovalInboxQuery = { box: ApprovalBox; page: number; q: string; type: ApprovalRequestType | '' };

export const APPROVALS_KEY = ['approvals'] as const;

export function approvalInboxPath({ box, page, q, type }: ApprovalInboxQuery): string {
  const search = new URLSearchParams({ box, page: String(page), size: String(APPROVAL_PAGE_SIZE) });
  if (q) search.set('q', q);
  if (type) search.set('type', type);
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

/** The caller's delegations to others and from others (tab "Ủy quyền duyệt", and the inbox banner). */
export function useApprovalDelegations() {
  return useQuery({
    queryKey: [...APPROVALS_KEY, 'delegations'],
    queryFn: () => api<ApprovalDelegations>('/api/approval-delegations'),
  });
}

/**
 * Mirrors the head of the backend record `ApprovalRequestResponse`; the steps, log and allowed actions join with the
 * detail page (FE-2).
 */
export type ApprovalRequestDetail = {
  id: string;
  type: ApprovalRequestType;
  status: ApprovalStatus;
  level: number;
  levelCount: number;
  summary: string;
  sender: EmployeeCard;
  sentAt: string;
  autoApproveDueAt: string | null;
};

/** One request, for the people involved; 404 `approval.not_found` for everyone else. */
export function useApprovalRequest(id: string) {
  return useQuery({
    queryKey: [...APPROVALS_KEY, 'request', id],
    queryFn: () => api<ApprovalRequestDetail>(`/api/approvals/${id}`),
  });
}
