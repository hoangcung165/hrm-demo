// View, day, filters and page of the Lịch phân ca live in the URL (`view`, `date`, `unit`, `shift`, `person`, `page`), so a
// reload or a link shows the same range. Defaults stay out of it: the month view, the company's today, everyone, page 1.
import { isValid, parseISO } from 'date-fns';
import { useSearchParams } from 'react-router';
import { companyToday } from '@/lib/company-time';
import { toIsoDate } from '@/lib/format';
import { daysOfRange, shiftViewRange, stepAnchor, type CalendarView } from './calendar-model';
import type { ShiftCalendarQuery } from './calendar-api';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** People per page on a desktop grid and on a phone agenda. */
export const GRID_PAGE_SIZE = 25;
export const AGENDA_PAGE_SIZE = 10;

export function useShiftCalendarFilters(compact: boolean, today: Date = companyToday()) {
  const [params, setParams] = useSearchParams();
  const view: CalendarView = params.get('view') === 'week' ? 'WEEK' : 'MONTH';
  const dateParam = params.get('date') ?? '';
  const parsed = DAY.test(dateParam) ? parseISO(dateParam) : null;
  const anchor = parsed && isValid(parsed) ? parsed : today;
  const idOf = (key: string) => (UUID.test(params.get(key) ?? '') ? params.get(key)! : '');
  const orgUnitId = idOf('unit');
  const shiftId = idOf('shift');
  const employeeId = idOf('person');
  const pageParam = Number(params.get('page') ?? '1');
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0;

  const range = shiftViewRange(view, anchor);
  const query: ShiftCalendarQuery = { from: toIsoDate(range.from), to: toIsoDate(range.to), orgUnitId, employeeId, shiftId, page, size: compact ? AGENDA_PAGE_SIZE : GRID_PAGE_SIZE };

  // Another range or filter starts on the first page.
  const write = (changes: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(keepPage ? changes : { ...changes, page: '' })) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };
  const goTo = (day: Date) => write({ date: toIsoDate(day) === toIsoDate(today) ? '' : toIsoDate(day) });

  return {
    view,
    anchor,
    today,
    range,
    days: daysOfRange(range),
    query,
    activeCount: [orgUnitId, shiftId, employeeId].filter(Boolean).length,
    isCurrent: toIsoDate(shiftViewRange(view, today).from) === toIsoDate(range.from),
    setView: (value: CalendarView) => write({ view: value === 'WEEK' ? 'week' : '' }),
    setUnit: (id: string) => write({ unit: id }),
    setShift: (id: string) => write({ shift: id }),
    setPerson: (id: string) => write({ person: id }),
    clear: () => write({ unit: '', shift: '', person: '' }),
    setPage: (index: number) => write({ page: index > 0 ? String(index + 1) : '' }, true),
    back: () => goTo(stepAnchor(anchor, view, -1)),
    forward: () => goTo(stepAnchor(anchor, view, 1)),
    toToday: () => write({ date: '' }),
  };
}

export type ShiftCalendarFilters = ReturnType<typeof useShiftCalendarFilters>;
