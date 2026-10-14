// Nguồn lực API (HRM-17): the heatmap. Contract: "## API contract" comments on issues #205 and #206.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EmployeeCard } from '@/features/project/api';

export const HEATMAP_GRANULARITIES = ['WEEK', 'MONTH'] as const;
export type HeatmapGranularity = (typeof HEATMAP_GRANULARITIES)[number];
export const HEATMAP_LEVELS = ['BENCH', 'PARTIAL', 'FULL', 'OVER'] as const;
export type HeatmapLevel = (typeof HEATMAP_LEVELS)[number];
export const HEATMAP_SORTS = ['LOAD_DESC', 'LOAD_ASC', 'NAME'] as const;
export type HeatmapSort = (typeof HEATMAP_SORTS)[number];

/** Mirrors the backend record `HeatmapResponse.Column`: a week (Monday to Sunday) or a month. Dates are ISO. */
export type HeatmapColumn = { from: string; to: string };

/** Mirrors `HeatmapResponse.Row`: `cells` follow `columns`, each the highest Tải phân bổ of the column. */
export type HeatmapRow = { employee: EmployeeCard; cells: number[]; peak: number };

/** Mirrors `HeatmapResponse.Thresholds`: the company's Ngưỡng nguồn lực. */
export type ResourceThresholds = { benchPercent: number; nearFullPercent: number; endingWeeks: number };

/** Mirrors the backend record `HeatmapResponse`. `total` counts the rows that pass the filters, every page. */
export type Heatmap = {
  from: string;
  to: string;
  granularity: HeatmapGranularity;
  columns: HeatmapColumn[];
  items: HeatmapRow[];
  total: number;
  page: number;
  size: number;
  summary: { people: number; overloadedNow: number; overloadedInWindow: number };
  thresholds: ResourceThresholds;
};

export const HEATMAP_PAGE_SIZE = 50;

/** `''` means no filter. `from` is any day of the first column (`''`: today). */
export type HeatmapQuery = {
  from: string;
  granularity: HeatmapGranularity;
  columns: number;
  q: string;
  orgUnitId: string;
  level: HeatmapLevel | '';
  sort: HeatmapSort;
  page: number;
};

export const RESOURCES_KEY = ['resources'] as const;

export function heatmapPath(query: HeatmapQuery): string {
  const search = new URLSearchParams({ granularity: query.granularity, columns: String(query.columns), sort: query.sort, page: String(query.page), size: String(HEATMAP_PAGE_SIZE) });
  if (query.from) search.set('from', query.from);
  if (query.q) search.set('q', query.q);
  if (query.orgUnitId) search.set('orgUnitId', query.orgUnitId);
  if (query.level) search.set('level', query.level);
  return `/api/resources/heatmap?${search}`;
}

/** One page of the heatmap. The previous page stays on screen while the next query loads. */
export function useHeatmap(query: HeatmapQuery, enabled = true) {
  return useQuery({
    queryKey: [...RESOURCES_KEY, 'heatmap', query],
    queryFn: () => api<Heatmap>(heatmapPath(query)),
    placeholderData: keepPreviousData,
    enabled,
  });
}
