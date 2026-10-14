// Nguồn lực API (HRM-17): Bench and Sắp hết dự án. Contract: "## API contract" comment on issue #206.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { EmployeeCard, ProjectRoleRef } from '@/features/project/api';
import { api } from '@/lib/api';
import { RESOURCES_KEY, type HeatmapGranularity, type ResourceThresholds } from './api';

export const RESOURCE_LIST_PAGE_SIZE = 50;

/** Mirrors the backend record `AllocationBrief`: one Phân bổ as a list row names it. Dates are ISO. */
export type AllocationBrief = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  projectRole: ProjectRoleRef | null;
  percent: number;
  startDate: string;
  endDate: string;
};

/** Mirrors `BenchResponse.Item`: `peak` is the highest Tải phân bổ in the period. */
export type BenchRow = { employee: EmployeeCard; peak: number; nextAllocation: AllocationBrief | null; latestProject: AllocationBrief | null };

/** Mirrors the backend record `BenchResponse`. `total` counts everyone under the threshold, every page. */
export type Bench = {
  from: string;
  to: string;
  granularity: HeatmapGranularity;
  total: number;
  page: number;
  size: number;
  summary: { noAllocation: number; belowThreshold: number };
  thresholds: ResourceThresholds;
  items: BenchRow[];
};

/** Mirrors `EndingResponse.Item`: an allocation that ends within the ending-soon weeks. */
export type EndingRow = { employee: EmployeeCard; allocation: AllocationBrief; daysLeft: number; loadAfter: number; next: AllocationBrief | null; withoutNext: boolean };

/** Mirrors the backend record `EndingResponse`. `summary` ignores the "only without next" filter. */
export type Ending = {
  weeks: number;
  total: number;
  page: number;
  size: number;
  summary: { endingSoon: number; withoutNext: number };
  items: EndingRow[];
};

/** `''` means no filter. `from` is any day of the period (`''`: today). */
export type BenchQuery = { from: string; granularity: HeatmapGranularity; orgUnitId: string; page: number; size?: number };
export type EndingQuery = { orgUnitId: string; onlyWithoutNext: boolean; page: number; size?: number };

export function benchPath({ from, granularity, orgUnitId, page, size = RESOURCE_LIST_PAGE_SIZE }: BenchQuery): string {
  const search = new URLSearchParams({ granularity, page: String(page), size: String(size) });
  if (from) search.set('from', from);
  if (orgUnitId) search.set('orgUnitId', orgUnitId);
  return `/api/resources/bench?${search}`;
}

export function endingPath({ orgUnitId, onlyWithoutNext, page, size = RESOURCE_LIST_PAGE_SIZE }: EndingQuery): string {
  const search = new URLSearchParams({ page: String(page), size: String(size) });
  if (orgUnitId) search.set('orgUnitId', orgUnitId);
  if (onlyWithoutNext) search.set('onlyWithoutNext', 'true');
  return `/api/resources/ending?${search}`;
}

/** One page of the Bench. The previous page stays on screen while the next query loads. */
export function useBench(query: BenchQuery) {
  return useQuery({ queryKey: [...RESOURCES_KEY, 'bench', query], queryFn: () => api<Bench>(benchPath(query)), placeholderData: keepPreviousData });
}

/** One page of Sắp hết dự án. */
export function useEnding(query: EndingQuery) {
  return useQuery({ queryKey: [...RESOURCES_KEY, 'ending', query], queryFn: () => api<Ending>(endingPath(query)), placeholderData: keepPreviousData });
}

/**
 * The counts on the tab labels: people on the Bench this week, and people with an allocation ending soon. One row is
 * enough. The Bench answer also brings the company's thresholds, which the ending list does not.
 */
export function useResourceCounts(orgUnitId: string, enabled = true) {
  const bench = useQuery({
    queryKey: [...RESOURCES_KEY, 'count', 'bench', orgUnitId],
    queryFn: () => api<Bench>(benchPath({ from: '', granularity: 'WEEK', orgUnitId, page: 0, size: 1 })),
    enabled,
  });
  const ending = useQuery({
    queryKey: [...RESOURCES_KEY, 'count', 'ending', orgUnitId],
    queryFn: async () => (await api<Ending>(endingPath({ orgUnitId, onlyWithoutNext: false, page: 0, size: 1 }))).summary.endingSoon,
    enabled,
  });
  return { bench: bench.data?.total, ending: ending.data, thresholds: bench.data?.thresholds };
}
