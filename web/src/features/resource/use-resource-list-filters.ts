// The department, the period (Bench only), "only without next" (Sắp hết dự án only) and the page of the Bench and
// Sắp hết dự án tabs live in the URL (`unit`, `view`, `from`, `nonext`, `page`). Defaults stay out of it: every unit,
// this week, everybody who is ending soon.
import { addMonths, addWeeks, differenceInCalendarWeeks, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { toIsoDate } from '@/lib/format';
import { useUrlListQuery } from '@/lib/use-url-list-query';
import type { HeatmapGranularity } from './api';
import type { BenchQuery, EndingQuery } from './list-api';
import { MAX_OFFSET } from './use-heatmap-filters';

const FILTERS = ['unit', 'view', 'from', 'nonext'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function useResourceListFilters(today: Date = new Date()) {
  const list = useUrlListQuery(FILTERS);
  const unitParam = list.params.get('unit') ?? '';
  const orgUnitId = UUID.test(unitParam) ? unitParam : '';
  const granularity: HeatmapGranularity = list.params.get('view') === 'month' ? 'MONTH' : 'WEEK';
  const fromParam = list.params.get('from') ?? '';
  const from = DAY.test(fromParam) && !Number.isNaN(parseISO(fromParam).getTime()) ? fromParam : '';
  const onlyWithoutNext = list.params.get('nonext') === '1';

  const bench: BenchQuery = { from, granularity, orgUnitId, page: list.pageIndex };
  const ending: EndingQuery = { orgUnitId, onlyWithoutNext, page: list.pageIndex };

  // The Bench pager moves one week or month at a time, at most MAX_OFFSET from the current one.
  const base = granularity === 'WEEK' ? startOfWeek(today, { weekStartsOn: 1 }) : startOfMonth(today);
  const start = from ? (granularity === 'WEEK' ? startOfWeek(parseISO(from), { weekStartsOn: 1 }) : startOfMonth(parseISO(from))) : base;
  const offset = granularity === 'WEEK' ? differenceInCalendarWeeks(start, base, { weekStartsOn: 1 }) : (start.getFullYear() - base.getFullYear()) * 12 + start.getMonth() - base.getMonth();
  const shift = (steps: number) => {
    const next = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offset + steps));
    list.setFilter('from', next === 0 ? '' : toIsoDate(granularity === 'WEEK' ? addWeeks(base, next) : addMonths(base, next)));
  };

  return {
    bench,
    ending,
    /** Read by the shared unit filter. */
    query: { orgUnitId },
    granularity,
    offset,
    onlyWithoutNext,
    setOrgUnit: (id: string) => list.setFilter('unit', id),
    setView: (value: HeatmapGranularity) => {
      list.setFilter('from', '');
      list.setFilter('view', value === 'MONTH' ? 'month' : '');
    },
    setOnlyWithoutNext: (value: boolean) => list.setFilter('nonext', value ? '1' : ''),
    canStepBack: offset > -MAX_OFFSET,
    canStepForward: offset < MAX_OFFSET,
    back: () => shift(-1),
    forward: () => shift(1),
    today: () => list.setFilter('from', ''),
    setPage: list.setPage,
    /** A unit or the "only without next" filter is on. */
    filtered: Boolean(orgUnitId || onlyWithoutNext),
    clear: () => {
      list.setFilter('unit', '');
      list.setFilter('nonext', '');
    },
  };
}

export type ResourceListFilters = ReturnType<typeof useResourceListFilters>;
