// Writing a Đơn nghỉ (HRM-18): the check while the form changes, sending, sending again after a return, files and the
// people to copy. Contract: "## API contract" comment on issue #20 (#272).
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import type { EmployeeCard } from '@/features/approval/api';
import { api } from '@/lib/api';
import { LEAVE_KEY, useLeaveRefresh, type DayPart, type LeaveAttachment, type LeaveBalance, type LeaveDay, type LeaveRequestDetail } from './api';

/** Mirrors `LeaveRequestPayload`. */
export type LeaveRequestPayload = {
  leaveTypeId: string;
  startDate: string;
  startPart: DayPart;
  endDate: string;
  endPart: DayPart;
  reason: string | null;
  cc: string[];
  attachmentIds: string[];
};

/** Mirrors `LeaveProblem`: why a request cannot be sent, with the numbers or dates the message needs. */
export type LeaveProblem = { code: string; details: Record<string, unknown> };

/** Mirrors `LeaveApproversPreview`: who decides first under the Luồng phê duyệt "Nghỉ phép". */
export type LeaveApprovers = { levelCount: number; firstLevel: EmployeeCard[]; autoApproveDays: number | null };

/** Mirrors `LeaveCheckResponse`. */
export type LeaveCheck = {
  days: LeaveDay[];
  total: number;
  balance: LeaveBalance | null;
  remainingAfter: number | null;
  problems: LeaveProblem[];
  approvers: LeaveApprovers;
};

/**
 * The check of the form as it stands (nothing is saved); runs once a type and both dates are there. The previous
 * answer stays while the next one loads, so the breakdown does not flicker.
 */
export function useLeaveCheck(payload: LeaveRequestPayload | null) {
  return useQuery({
    queryKey: [...LEAVE_KEY, 'check', payload],
    queryFn: () => api<LeaveCheck>('/api/leave-requests/check', { method: 'POST', body: payload }),
    enabled: payload !== null,
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: false,
  });
}

/** Gửi đơn, or for a returned request (`id`) Sửa và gửi lại; refused with the first problem's code and `problems`. */
export function useSendLeaveRequest(id?: string) {
  const refresh = useLeaveRefresh();
  return useMutation({
    mutationFn: (payload: LeaveRequestPayload) =>
      api<LeaveRequestDetail>(id ? `/api/leave-requests/${id}` : '/api/leave-requests', { method: id ? 'PUT' : 'POST', body: payload }),
    onSuccess: refresh,
  });
}

/** Uploads one file; its id goes into the request when it is sent. */
export function uploadLeaveAttachment(file: File) {
  const data = new FormData();
  data.append('file', file);
  return api<LeaveAttachment>('/api/leave-attachments', { method: 'POST', body: data });
}

/** People the request may copy (CC): active Employees by name or code, the caller left out; the first 20. */
export function useCcCandidates(q: string, enabled: boolean) {
  return useQuery({
    queryKey: [...LEAVE_KEY, 'cc-candidates', q],
    queryFn: () => api<EmployeeCard[]>(`/api/leave-requests/cc-candidates${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}
