// "Nhóm của tôi" API (HRM-20/BE-3). Contract: "## API contract: HRM-20/BE-3" on issue #22.
import { useQuery } from '@tanstack/react-query';
import type { EmployeeCard } from '@/features/approval/api';
import type { LeaveTypeRef } from '@/features/leave/api';
import { ApiError, api } from '@/lib/api';
import { DASHBOARD_KEY } from './api';

/** Mirrors `TeamResponse.Leave`: approved leave that goes on or starts within the next 30 days. */
export type TeamLeave = { leaveType: LeaveTypeRef; startDate: string; endDate: string };

/** Mirrors `TeamResponse.Member`: `load` is the peak Tải phân bổ of this week, the Heatmap's own cell. */
export type TeamMember = { employee: EmployeeCard; load: number; upcomingLeave: TeamLeave[] };

/** Mirrors `TeamResponse`: the Monday and Sunday of the week, the company's thresholds and the members by name. */
export type DashboardTeam = {
  weekFrom: string;
  weekTo: string;
  thresholds: { benchPercent: number; nearFullPercent: number; endingWeeks: number };
  members: TeamMember[];
};

export const DASHBOARD_TEAM_KEY = [...DASHBOARD_KEY, 'team'] as const;

/** An Account that heads no unit has no team: the API answers 403, which the page reads as "no block", not a failure. */
export const headsNoUnit = (error: unknown): boolean => error instanceof ApiError && error.status === 403;

export function useDashboardTeam(enabled = true) {
  return useQuery({
    queryKey: DASHBOARD_TEAM_KEY,
    queryFn: () => api<DashboardTeam>('/api/dashboard/team'),
    enabled,
    retry: (count, error) => !headsNoUnit(error) && count < 1,
  });
}
