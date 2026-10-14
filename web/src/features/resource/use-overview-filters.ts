// The week and the department of the Tổng quan tab live in the URL (`week`, `unit`). Defaults stay out of it: this
// week, every unit. The pager moves one week at a time, at most MAX_OFFSET from the current one.
import { addWeeks, differenceInCalendarWeeks, parseISO, startOfWeek } from 'date-fns';
import { toIsoDate } from '@/lib/format';
import { useUrlListQuery } from '@/lib/use-url-list-query';
import type { OverviewQuery } from './overview-api';
import { MAX_OFFSET } from './use-heatmap-filters';

const FILTERS = ['unit', 'week'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function useOverviewFilters(today: Date = new Date()) {
  const list = useUrlListQuery(FILTERS);
  const unitParam = list.params.get('unit') ?? '';
  const orgUnitId = UUID.test(unitParam) ? unitParam : '';
  const weekParam = list.params.get('week') ?? '';
  const week = DAY.test(weekParam) && !Number.isNaN(parseISO(weekParam).getTime()) ? weekParam : '';
  const query: OverviewQuery = { week, orgUnitId };

  const base = startOfWeek(today, { weekStartsOn: 1 });
  const start = week ? startOfWeek(parseISO(week), { weekStartsOn: 1 }) : base;
  const offset = differenceInCalendarWeeks(start, base, { weekStartsOn: 1 });
  const shift = (steps: number) => {
    const next = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offset + steps));
    list.setFilter('week', next === 0 ? '' : toIsoDate(addWeeks(base, next)));
  };

  return {
    query,
    granularity: 'WEEK' as const,
    offset,
    setOrgUnit: (id: string) => list.setFilter('unit', id),
    canStepBack: offset > -MAX_OFFSET,
    canStepForward: offset < MAX_OFFSET,
    back: () => shift(-1),
    forward: () => shift(1),
    today: () => list.setFilter('week', ''),
    filtered: Boolean(orgUnitId),
    clear: () => list.setFilter('unit', ''),
  };
}

export type OverviewFilters = ReturnType<typeof useOverviewFilters>;
