// Headcount charts of Tổng quan (HRM-20). Contract: "## API contract: HRM-20/BE-3" comment on issue #22.
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DASHBOARD_KEY } from './api';

/** Active Employees who belong directly to the unit; `orgUnitId` is null for those directly under the company. */
export type UnitCount = { orgUnitId: string | null; orgUnitName: string | null; count: number };
/** `month` is `yyyy-MM`. */
export type MonthFlow = { month: string; joins: number; leaves: number };

/** Mirrors the backend record `HeadcountResponse`: `byUnit` largest first, `months` six, the current one last, zeros kept. */
export type DashboardHeadcount = { date: string; byUnit: UnitCount[]; months: MonthFlow[] };

export function useDashboardHeadcount(enabled: boolean) {
  return useQuery({ queryKey: [...DASHBOARD_KEY, 'headcount'], queryFn: () => api<DashboardHeadcount>('/api/dashboard/headcount'), enabled });
}
