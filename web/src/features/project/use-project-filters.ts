// Tab, search, filters and page of the project list live in the URL (`tab`, `q`, `status`, `orgUnitId`,
// `overloaded`, `page`). Defaults stay out of the URL: the "Tôi quản lý" tab for a PM (else "Tất cả dự án"), every
// status but "Đã đóng", every unit.
import { useUrlListQuery } from '@/lib/use-url-list-query';
import type { ProjectListQuery } from './api';

const FILTERS = ['tab', 'status', 'orgUnitId', 'overloaded'] as const;

export const PROJECT_TABS = ['mine', 'all'] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];

/** The status choices of the filter; `OPEN` (every status but closed) is the default. */
export const PROJECT_STATUS_FILTERS = ['OPEN', 'ACTIVE', 'PLANNED', 'ON_HOLD', 'CLOSED', 'ALL'] as const;
export type ProjectStatusFilter = (typeof PROJECT_STATUS_FILTERS)[number];
const STATUS_PARAM: Record<ProjectStatusFilter, string> = {
  OPEN: '',
  ACTIVE: 'ACTIVE',
  PLANNED: 'PLANNED',
  ON_HOLD: 'ON_HOLD',
  CLOSED: 'CLOSED',
  ALL: 'PLANNED,ACTIVE,ON_HOLD,CLOSED',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const oneOf = <T extends string>(values: readonly T[], value: string | null, fallback: T): T => (values.includes(value as T) ? (value as T) : fallback);

/** `canHaveMine`: the Account manages projects (PROJECT_EDIT and an Employee), so "Tôi quản lý" is offered and first. */
export function useProjectFilters(canHaveMine: boolean) {
  const list = useUrlListQuery(FILTERS);
  const defaultTab: ProjectTab = canHaveMine ? 'mine' : 'all';
  const tab = canHaveMine ? oneOf<ProjectTab>(PROJECT_TABS, list.params.get('tab'), defaultTab) : 'all';
  const status = oneOf<ProjectStatusFilter>(PROJECT_STATUS_FILTERS, list.params.get('status'), 'OPEN');
  const orgUnitParam = list.params.get('orgUnitId');
  const orgUnitId = orgUnitParam && UUID.test(orgUnitParam) ? orgUnitParam : '';
  const overloaded = list.params.get('overloaded') === 'true';
  const query: ProjectListQuery = { page: list.pageIndex, q: list.q, mine: tab === 'mine', status: STATUS_PARAM[status], orgUnitId, overloaded };
  /** Filters that differ from the defaults; the tab and the search are not counted. */
  const activeCount = [status !== 'OPEN', orgUnitId, overloaded].filter(Boolean).length;
  return {
    query,
    tab,
    status,
    activeCount,
    canHaveMine,
    search: list.search,
    setSearch: list.setSearch,
    setTab: (value: ProjectTab) => list.setFilter('tab', value === defaultTab ? '' : value),
    setStatus: (value: ProjectStatusFilter) => list.setFilter('status', value === 'OPEN' ? '' : value),
    setOrgUnit: (id: string) => list.setFilter('orgUnitId', id),
    setOverloaded: (on: boolean) => list.setFilter('overloaded', on ? 'true' : ''),
    setPage: list.setPage,
    /** A search, or a filter that differs from the defaults: "Xóa bộ lọc" is offered. */
    filtered: Boolean(list.q || list.search.trim() || activeCount > 0),
    /** Back to the defaults on the same tab. */
    clear: () => {
      list.clear();
      if (tab !== defaultTab) list.setFilter('tab', tab);
    },
  };
}

export type ProjectFilters = ReturnType<typeof useProjectFilters>;
