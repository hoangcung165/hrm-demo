// Nguồn lực API (HRM-17): the Tổng quan dashboard. Contract: "## API contract" comment on issue #206.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { EmployeeCard } from '@/features/project/api';
import { api } from '@/lib/api';
import { RESOURCES_KEY, type ResourceThresholds } from './api';
import type { AllocationBrief } from './list-api';

/** People per level of Tải phân bổ: Bench, Còn trống, Gần đầy hoặc đủ, Quá tải. */
export type OverviewLevels = { bench: number; partial: number; full: number; over: number };

/** Mirrors `OverviewResponse.Tiles`. Project counts are company-wide; the rest follow the department. `averageLoad` is null with nobody in the pool. */
export type OverviewTiles = {
  projectsRunning: number;
  projectsPlanned: number;
  projectsOnHold: number;
  projectStaff: number;
  people: number;
  averageLoad: number | null;
  bench: number;
  overloadedNow: number;
  overloadedIn12Weeks: number;
  endingSoon: number;
};

/** One of the 12 weeks from the week shown. */
export type OverviewWeek = { from: string; to: string; levels: OverviewLevels };

/** A running project: `fte` is the sum of the percents / 100; `upcoming` counts people who start within the 12 weeks. */
export type OverviewProject = { projectId: string; code: string; name: string; headcount: number; fte: number; overloaded: number; upcoming: number };

export type OverviewOverloaded = { employee: EmployeeCard; peak: number; from: string; to: string; projects: string[] };
export type OverviewEnding = { employee: EmployeeCard; allocation: AllocationBrief; daysLeft: number; loadAfter: number; withoutNext: boolean };

/** Mirrors the backend record `OverviewResponse`. */
export type Overview = {
  weekFrom: string;
  weekTo: string;
  tiles: OverviewTiles;
  thisWeek: OverviewLevels;
  weeks: OverviewWeek[];
  projects: OverviewProject[];
  attention: { overloaded: OverviewOverloaded[]; ending: OverviewEnding[] };
  thresholds: ResourceThresholds;
};

/** `''` means no filter. `week` is any day of the week (`''`: this week). */
export type OverviewQuery = { week: string; orgUnitId: string };

export function overviewPath({ week, orgUnitId }: OverviewQuery): string {
  const search = new URLSearchParams();
  if (week) search.set('week', week);
  if (orgUnitId) search.set('orgUnitId', orgUnitId);
  const query = search.toString();
  return `/api/resources/overview${query ? `?${query}` : ''}`;
}

/** The whole dashboard in one answer. The previous week stays on screen while the next one loads. */
export function useOverview(query: OverviewQuery, enabled = true) {
  return useQuery({ queryKey: [...RESOURCES_KEY, 'overview', query], queryFn: () => api<Overview>(overviewPath(query)), placeholderData: keepPreviousData, enabled });
}
