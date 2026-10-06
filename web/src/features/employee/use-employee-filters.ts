// Search, filters, order and page of the employee list live in the URL (`q`, `orgUnitId`, `includeSubUnits`,
// `positionId`, `status`, `sort`, `page`), so they survive a reload and can be linked. Defaults stay out of the URL:
// every unit with its child units, every position, "Thử việc và chính thức", by employee code.
import { useUrlListQuery } from '@/lib/use-url-list-query';
import { EMPLOYEE_SORTS, type EmployeeListQuery, type EmployeeSort } from './api';

const FILTERS = ['orgUnitId', 'includeSubUnits', 'positionId', 'status', 'sort'] as const;

/** The status choices of the filter; `CURRENT` (on probation and official) is the default. */
export const STATUS_FILTERS = ['CURRENT', 'PROBATION', 'OFFICIAL', 'INACTIVE', 'ALL'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
const STATUS_PARAM: Record<StatusFilter, string> = { CURRENT: 'PROBATION,OFFICIAL', PROBATION: 'PROBATION', OFFICIAL: 'OFFICIAL', INACTIVE: 'INACTIVE', ALL: '' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** An id from the URL, or `''`: a hand-made link must not make the API answer 400. */
const idOrEmpty = (value: string | null) => (value && UUID.test(value) ? value : '');
const oneOf = <T extends string>(values: readonly T[], value: string | null, fallback: T): T => (values.includes(value as T) ? (value as T) : fallback);

export function useEmployeeFilters() {
  const list = useUrlListQuery(FILTERS);
  const orgUnitId = idOrEmpty(list.params.get('orgUnitId'));
  const includeSubUnits = list.params.get('includeSubUnits') !== 'false';
  const positionId = idOrEmpty(list.params.get('positionId'));
  const status = oneOf<StatusFilter>(STATUS_FILTERS, list.params.get('status'), 'CURRENT');
  const sort = oneOf<EmployeeSort>(EMPLOYEE_SORTS, list.params.get('sort'), 'code');
  const query: EmployeeListQuery = { page: list.pageIndex, q: list.q, orgUnitId, includeSubUnits, positionId, status: STATUS_PARAM[status], sort };
  /** Filters and order that differ from the defaults; the search is not counted. */
  const activeCount = [orgUnitId, positionId, status !== 'CURRENT', sort !== 'code'].filter(Boolean).length;
  return {
    query,
    status,
    activeCount,
    search: list.search,
    setSearch: list.setSearch,
    setOrgUnit: (id: string) => list.setFilter('orgUnitId', id),
    /** On is the default and stays out of the URL. */
    setIncludeSubUnits: (on: boolean) => list.setFilter('includeSubUnits', on ? '' : 'false'),
    setPosition: (id: string) => list.setFilter('positionId', id),
    setStatus: (value: StatusFilter) => list.setFilter('status', value === 'CURRENT' ? '' : value),
    setSort: (value: EmployeeSort) => list.setFilter('sort', value === 'code' ? '' : value),
    setPage: list.setPage,
    /** A search, or anything that differs from the defaults: "Xóa bộ lọc" is offered. */
    filtered: Boolean(list.q || list.search.trim() || activeCount > 0),
    /** Back to the defaults, search included. */
    clear: list.clear,
  };
}

export type EmployeeFilters = ReturnType<typeof useEmployeeFilters>;
