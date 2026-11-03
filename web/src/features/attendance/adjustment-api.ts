// Đơn bổ sung công (HRM-24/BE-3, #395): `/api/attendance/adjustments`, contract on issue #26. An Employee gives the time
// of a punch they forgot on one of their own days; it goes through the Luồng phê duyệt "Bổ sung công". Approving goes
// through `/api/approvals`; every change here refreshes the approvals and the Công theo ngày too.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { APPROVALS_KEY, type ApprovalRequestDetail, type EmployeeCard } from '@/features/approval/api';
import { api } from '@/lib/api';
import type { DailyDay, DailyShift } from './daily-api';
import { ATTENDANCE_DAILY_KEY } from './import-api';

export const ATTENDANCE_ADJUSTMENT_KEY = ['attendance', 'adjustments'] as const;

export type AdjustmentStatus = 'PENDING' | 'RETURNED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type AdjustmentProblem = 'future' | 'too_old' | 'no_shift' | 'manual_entry' | 'already_open' | 'nothing_missing';

/** Who approves first, from the Luồng phê duyệt "Bổ sung công". */
export type AdjustmentApprovers = { levelCount: number; firstLevel: EmployeeCard[]; autoApproveDays: number | null };

/** One of the caller's days as the form needs it; `problems` empty means a request can be sent. */
export type AdjustmentCheck = { date: string; day: DailyDay | null; shift: DailyShift | null; inMissing: boolean; outMissing: boolean; problems: AdjustmentProblem[]; approvers: AdjustmentApprovers };

/** `in` and `out` carry the company's offset; `dayAfter` is the day as if approved. */
export type AdjustmentDetail = {
  id: string;
  status: AdjustmentStatus;
  employee: EmployeeCard;
  date: string;
  shift: DailyShift | null;
  in: string | null;
  out: string | null;
  reason: string;
  dayNow: DailyDay | null;
  dayAfter: DailyDay | null;
  approval: ApprovalRequestDetail | null;
  canEdit: boolean;
  canCancel: boolean;
  createdAt: string;
  updatedAt: string;
};

/** "HH:mm" for the side(s) the day has no time for. */
export type AdjustmentPayload = { date?: string; in?: string; out?: string; reason: string };

export function useAdjustmentCheck(date: string) {
  return useQuery({
    queryKey: [...ATTENDANCE_ADJUSTMENT_KEY, 'check', date],
    queryFn: () => api<AdjustmentCheck>(`/api/attendance/adjustments/check?date=${date}`),
    enabled: date !== '',
    retry: false,
  });
}

export function useAdjustment(id: string) {
  return useQuery({
    queryKey: [...ATTENDANCE_ADJUSTMENT_KEY, id],
    queryFn: () => api<AdjustmentDetail>(`/api/attendance/adjustments/${id}`),
    retry: false,
  });
}

function useRefresh() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ATTENDANCE_ADJUSTMENT_KEY }),
      client.invalidateQueries({ queryKey: ATTENDANCE_DAILY_KEY }),
      client.invalidateQueries({ queryKey: APPROVALS_KEY }),
    ]);
}

export function useSendAdjustment() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (body: AdjustmentPayload) => api<AdjustmentDetail>('/api/attendance/adjustments', { method: 'POST', body }), onSuccess: refresh });
}

export function useResubmitAdjustment(id: string) {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (body: AdjustmentPayload) => api<AdjustmentDetail>(`/api/attendance/adjustments/${id}`, { method: 'PUT', body }), onSuccess: refresh });
}

export function useCancelAdjustment(id: string) {
  const refresh = useRefresh();
  return useMutation({ mutationFn: () => api<AdjustmentDetail>(`/api/attendance/adjustments/${id}/cancel`, { method: 'POST' }), onSuccess: refresh });
}
