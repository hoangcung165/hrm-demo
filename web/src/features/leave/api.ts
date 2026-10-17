// Leave API (Nghỉ phép, HRM-18): Số dư phép and Đơn nghỉ of the caller. Contract: "## API contract" comment on issue
// #20 (#272). Days are numbers in steps of 0,5.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApprovalRequestDetail, EmployeeCard } from '@/features/approval/api';
import { APPROVALS_KEY } from '@/features/approval/api';
import { api, apiDownload } from '@/lib/api';
import { saveFile } from '@/lib/save-file';

export type DayPart = 'FULL' | 'MORNING' | 'AFTERNOON';
export type LeavePay = 'COMPANY' | 'SOCIAL_INSURANCE' | 'UNPAID';
export type LeaveDayKind = 'WORKING' | 'DAY_OFF' | 'HOLIDAY';
export type LeaveRequestStatus = 'PENDING' | 'RETURNED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/** Mirrors `LeaveTypeRef`: how requests and balances name a Loại nghỉ. */
export type LeaveTypeRef = { id: string; code: string; name: string; active: boolean };

/**
 * Mirrors `LeaveCarryOver`: the Phép tồn of the year, kept apart from its own Phép năm. `remaining` is zero after
 * `expiresOn`; `lost` is zero until then.
 */
export type LeaveCarryOver = { granted: number; used: number; remaining: number; lost: number; expiresOn: string };

/** Mirrors `LeaveBalance`. `remaining`, `accrued`, `entitled`, `available` are null for a type without a limit. */
export type LeaveBalance = {
  leaveTypeId: string;
  year: number;
  limited: boolean;
  accrued: number | null;
  entitled: number | null;
  used: number;
  pending: number;
  remaining: number | null;
  advanceAvailable: number;
  available: number | null;
  /** Null: no Phép tồn this year (the type does not carry days over, or nothing was left). */
  carryOver: LeaveCarryOver | null;
};

export type LeaveBalanceItem = { leaveType: LeaveTypeRef; pay: LeavePay; halfDayAllowed: boolean; attachmentRequired: boolean; balance: LeaveBalance };
export type LeaveBalances = { employee: EmployeeCard; year: number; asOf: string; items: LeaveBalanceItem[] };

/** Mirrors `LeaveDay`: one calendar day of a request and what it counts. */
export type LeaveDay = { date: string; kind: LeaveDayKind; morning: boolean; afternoon: boolean; value: number; holidayName: string | null };

export type LeaveAttachment = { id: string; fileName: string; contentType: string; sizeBytes: number; uploadedAt: string };

/** Mirrors `LeaveProjectRef`: a project whose members include the sender and whose dates meet the request. */
export type LeaveProjectRef = { id: string; code: string; name: string };

export type LeaveAbsence = { employee: EmployeeCard; leaveType: LeaveTypeRef; startDate: string; startPart: DayPart; endDate: string; endPart: DayPart; status: LeaveRequestStatus };

/** Mirrors `LeaveRequestListItem`: a row of "Đơn của tôi". */
export type LeaveRequestListItem = {
  id: string;
  status: LeaveRequestStatus;
  leaveType: LeaveTypeRef;
  startDate: string;
  startPart: DayPart;
  endDate: string;
  endPart: DayPart;
  days: number;
  canCancel: boolean;
  createdAt: string;
};

/** Mirrors `LeaveRequestResponse`. `approval`, `balance` and the before/after are null for a person copied (CC). */
export type LeaveRequestDetail = Omit<LeaveRequestListItem, 'canCancel'> & {
  employee: EmployeeCard;
  dayList: LeaveDay[];
  reason: string | null;
  cc: EmployeeCard[];
  attachments: LeaveAttachment[];
  approval: ApprovalRequestDetail | null;
  balance: LeaveBalance | null;
  remainingBefore: number | null;
  remainingAfter: number | null;
  unitAbsences: LeaveAbsence[];
  /** Empty for a person who only reads the request as a CC. */
  affectedProjects: LeaveProjectRef[];
  canEdit: boolean;
  canCancel: boolean;
  updatedAt: string;
  cancelledAt: string | null;
};

export const LEAVE_KEY = ['leave'] as const;
export const LEAVE_PAGE_SIZE = 20;

/** The caller's Số dư phép for a year; 403 `approval.no_employee` for an Account without an Employee. */
export function useLeaveBalances(year: number) {
  return useQuery({
    queryKey: [...LEAVE_KEY, 'balances', year],
    queryFn: () => api<LeaveBalances>(`/api/leave-balances?year=${year}`),
    retry: false,
  });
}

/** "Đơn của tôi": the caller's requests touching the year, latest first, one page. */
export function useMyLeaveRequests(year: number, page: number, enabled = true) {
  return useQuery({
    queryKey: [...LEAVE_KEY, 'mine', year, page],
    queryFn: () => api<{ items: LeaveRequestListItem[]; total: number }>(`/api/leave-requests?year=${year}&page=${page}&size=${LEAVE_PAGE_SIZE}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export const leaveRequestKey = (id: string) => [...LEAVE_KEY, 'request', id] as const;

/**
 * One request, for its sender, its approvers and the people it copies; 404 `approval.not_found` for others.
 * `version` (the approval request's status and level, in the inbox) loads it again once a decision changed it.
 */
export function useLeaveRequest(id: string, version?: string) {
  return useQuery({
    queryKey: version ? [...leaveRequestKey(id), version] : leaveRequestKey(id),
    queryFn: () => api<LeaveRequestDetail>(`/api/leave-requests/${id}`),
  });
}

/** After a request changes: the balances, the lists, the inbox and the approval request all move with it. */
export function useLeaveRefresh() {
  const queryClient = useQueryClient();
  return (detail?: LeaveRequestDetail) => {
    if (detail) queryClient.setQueryData(leaveRequestKey(detail.id), detail);
    void queryClient.invalidateQueries({ queryKey: LEAVE_KEY, predicate: (query) => !detail || query.queryKey[2] !== detail.id });
    void queryClient.invalidateQueries({ queryKey: APPROVALS_KEY });
  };
}

/** Hủy đơn: while it waits or is returned, or once approved until it starts (409 `leave.already_started` after). */
export function useCancelLeaveRequest(id: string) {
  const refresh = useLeaveRefresh();
  return useMutation({
    mutationFn: () => api<LeaveRequestDetail>(`/api/leave-requests/${id}/cancel`, { method: 'POST', body: {} }),
    onSuccess: refresh,
  });
}

export async function downloadLeaveAttachment(requestId: string, attachment: LeaveAttachment) {
  const file = await apiDownload(`/api/leave-requests/${requestId}/attachments/${attachment.id}`);
  saveFile(file.blob, file.fileName ?? attachment.fileName);
}
