// Tổng quan API (HRM-20). Contracts: "## API contract" comments on issue #22 (tiles: BE-1, #357).
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const DASHBOARD_KEY = ['dashboard'] as const;

/** Mirrors the backend record `DashboardTilesResponse`: the numbers of the stat tiles in the caller's scope, for the company's `date`. */
export type DashboardTiles = {
  date: string;
  employees: number;
  inProbation: number;
  onLeaveToday: number;
  workingToday: number;
};

/** The tiles; each block of the page asks for its own data, so a failing one never hides the others. */
export function useDashboardTiles(enabled: boolean) {
  return useQuery({ queryKey: [...DASHBOARD_KEY, 'tiles'], queryFn: () => api<DashboardTiles>('/api/dashboard/tiles'), enabled });
}
