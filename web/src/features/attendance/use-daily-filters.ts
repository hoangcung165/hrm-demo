// Period, filters, sort and page of the Công theo ngày live in the URL (`from`, `to`, `unit`, `q`,
// `abnormal`, `sort`, `page`), so a reload or a link shows the same list. Defaults stay out of it: this week, everyone,
// the most abnormal first, page 1.
import { isValid, parseISO } from 'date-fns';
import { useSearchParams } from 'react-router';
import { companyToday } from '@/lib/company-time';
import { toIsoDate } from '@/lib/format';
import { DAILY_MAX_DAYS, DAILY_PAGE_SIZE, type DailyQuery, type DailySort } from './daily-api';
import { rangeLength, stepRange, weekOf } from './daily-model';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (value: string | null) => (value && DAY.test(value) && isValid(parseISO(value)) ? value : null);

export function useDailyFilters(today: Date = companyToday()) {
  const [params, setParams] = useSearchParams();
  const week = weekOf(today);
  const fromParam = validDay(params.get('from'));
  const toParam = validDay(params.get('to'));
  const custom = fromParam !== null && toParam !== null && toParam >= fromParam;
  const from = custom ? fromParam : toIsoDate(week.from);
  const to = custom ? toParam : toIsoDate(week.to);
  const idOf = (key: string) => (UUID.test(params.get(key) ?? '') ? params.get(key)! : '');
  const sort: DailySort = params.get('sort') === 'name' ? 'name' : 'abnormal';
  const pageParam = Number(params.get('page') ?? '1');
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0;
  const query: DailyQuery = {
    from,
    to,
    orgUnitId: idOf('unit'),
    employeeId: '',
    q: (params.get('q') ?? '').trim(),
    abnormalOnly: params.get('abnormal') === '1',
    sort,
    page,
    size: DAILY_PAGE_SIZE,
  };

  // Another range, filter or sort starts on the first page.
  const write = (changes: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(keepPage ? changes : { ...changes, page: '' })) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };
  const setRange = (start: string, end: string) => {
    const isWeek = start === toIsoDate(week.from) && end === toIsoDate(week.to);
    write({ from: isWeek ? '' : start, to: isWeek ? '' : end });
  };
  const step = (direction: -1 | 1) => {
    const moved = stepRange(from, to, direction);
    setRange(moved.from, moved.to);
  };

  return {
    query,
    today,
    tooLong: rangeLength(from, to) > DAILY_MAX_DAYS,
    isThisWeek: from === toIsoDate(week.from) && to === toIsoDate(week.to),
    /** Unit and search; "Chỉ ngày bất thường" and the sort are not counted. */
    activeCount: [query.orgUnitId, query.q].filter(Boolean).length,
    setRange,
    back: () => step(-1),
    forward: () => step(1),
    toThisWeek: () => write({ from: '', to: '' }),
    setUnit: (id: string) => write({ unit: id }),
    setSearch: (text: string) => write({ q: text.trim() }),
    setAbnormal: (on: boolean) => write({ abnormal: on ? '1' : '' }),
    setFilters: (values: { unit: string; q: string; sort: DailySort }) => write({ unit: values.unit, q: values.q.trim(), sort: values.sort === 'name' ? 'name' : '' }),
    setSort: (value: DailySort) => write({ sort: value === 'name' ? 'name' : '' }),
    setPage: (index: number) => write({ page: index > 0 ? String(index + 1) : '' }, true),
    clear: () => write({ unit: '', q: '' }),
  };
}

export type DailyFilters = ReturnType<typeof useDailyFilters>;
