// View, period, search, filters and page of the heatmap live in the URL (`view`, `from`, `unit`, `level`, `sort`, `q`,
// `page`). Defaults stay out of it: weeks, the current period, every unit and level, highest load first.
// `columns`: how many weeks or months a page shows (12 / 6 on a desktop, 3 on a phone).
import { addMonths, addWeeks, differenceInCalendarWeeks, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { toIsoDate } from '@/lib/format';
import { useUrlListQuery } from '@/lib/use-url-list-query';
import { HEATMAP_LEVELS, HEATMAP_SORTS, type HeatmapGranularity, type HeatmapLevel, type HeatmapQuery, type HeatmapSort } from './api';

const FILTERS = ['view', 'from', 'unit', 'level', 'sort'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** How far from the current period the pager goes, in weeks or months. */
export const MAX_OFFSET = 12;

export const defaultColumns = (granularity: HeatmapGranularity, compact: boolean) => (compact ? 3 : granularity === 'WEEK' ? 12 : 6);

export function useHeatmapFilters(compact: boolean, today: Date = new Date()) {
  const list = useUrlListQuery(FILTERS);
  const granularity: HeatmapGranularity = list.params.get('view') === 'month' ? 'MONTH' : 'WEEK';
  const fromParam = list.params.get('from') ?? '';
  const from = DAY.test(fromParam) && !Number.isNaN(parseISO(fromParam).getTime()) ? fromParam : '';
  const unitParam = list.params.get('unit') ?? '';
  const orgUnitId = UUID.test(unitParam) ? unitParam : '';
  const levelParam = (list.params.get('level') ?? '').toUpperCase();
  const level = (HEATMAP_LEVELS as readonly string[]).includes(levelParam) ? (levelParam as HeatmapLevel) : '';
  const sortParam = (list.params.get('sort') ?? '').toUpperCase().replace('-', '_');
  const sort = (HEATMAP_SORTS as readonly string[]).includes(sortParam) ? (sortParam as HeatmapSort) : 'LOAD_DESC';
  const columns = defaultColumns(granularity, compact);

  const query: HeatmapQuery = { from, granularity, columns, q: list.q, orgUnitId, level, sort, page: list.pageIndex };
  const activeCount = [orgUnitId, level, sort !== 'LOAD_DESC'].filter(Boolean).length;

  // The pager counts in columns from the current period; the period shown is the first day of its first column.
  const base = granularity === 'WEEK' ? startOfWeek(today, { weekStartsOn: 1 }) : startOfMonth(today);
  const start = from ? (granularity === 'WEEK' ? startOfWeek(parseISO(from), { weekStartsOn: 1 }) : startOfMonth(parseISO(from))) : base;
  const offset = granularity === 'WEEK' ? differenceInCalendarWeeks(start, base, { weekStartsOn: 1 }) : (start.getFullYear() - base.getFullYear()) * 12 + start.getMonth() - base.getMonth();
  const shift = (steps: number) => {
    const next = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offset + steps));
    const day = granularity === 'WEEK' ? addWeeks(base, next) : addMonths(base, next);
    list.setFilter('from', next === 0 ? '' : toIsoDate(day));
  };

  return {
    query,
    granularity,
    columns,
    activeCount,
    offset,
    search: list.search,
    setSearch: list.setSearch,
    setView: (value: HeatmapGranularity) => {
      list.setFilter('from', '');
      list.setFilter('view', value === 'MONTH' ? 'month' : '');
    },
    canStepBack: offset > -MAX_OFFSET,
    canStepForward: offset < MAX_OFFSET,
    back: () => shift(-columns),
    forward: () => shift(columns),
    today: () => list.setFilter('from', ''),
    setOrgUnit: (id: string) => list.setFilter('unit', id),
    setLevel: (value: HeatmapLevel | '') => list.setFilter('level', value.toLowerCase()),
    setSort: (value: HeatmapSort) => list.setFilter('sort', value === 'LOAD_DESC' ? '' : value.toLowerCase().replace('_', '-')),
    setPage: list.setPage,
    /** A search or a filter that differs from the defaults: "Xóa bộ lọc" is offered. */
    filtered: Boolean(list.q || list.search.trim() || activeCount > 0),
    /** Back to the defaults of search and filters; the view and the period stay. */
    clear: () => {
      list.clear();
      list.setFilter('view', granularity === 'MONTH' ? 'month' : '');
      list.setFilter('from', from);
    },
  };
}

export type HeatmapFilters = ReturnType<typeof useHeatmapFilters>;
