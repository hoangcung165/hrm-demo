// "Nghỉ hôm nay" (HRM-20/BE-1). Contract: "## API contract: dashboard tiles and leave today" comment on issue #22.
import { useQuery } from '@tanstack/react-query';
import type { EmployeeCard } from '@/features/approval/api';
import type { DayPart, LeaveTypeRef } from '@/features/leave/api';
import { api } from '@/lib/api';
import { DASHBOARD_KEY } from './api';

/** One approved request that holds today: `part` is the part of today, `until` the last day the request takes. */
export type LeaveTodayEntry = { requestId: string; employee: EmployeeCard; leaveType: LeaveTypeRef; part: DayPart; until: string };

/** Mirrors the backend record `LeaveTodayResponse`: by name, approved only, in the caller's data scope. */
export type LeaveToday = { date: string; entries: LeaveTodayEntry[] };

export function useDashboardLeaveToday(enabled: boolean) {
  return useQuery({ queryKey: [...DASHBOARD_KEY, 'leave-today'], queryFn: () => api<LeaveToday>('/api/dashboard/leave-today'), enabled });
}
