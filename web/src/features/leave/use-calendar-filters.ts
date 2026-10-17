// View, day and filters of the Lịch nghỉ phép live in the URL (`view`, `date`, `unit`, `project`), so a reload or a
// link shows the same range. Defaults stay out of it: the month view, the company's today, every unit and project.
import { isValid, parseISO } from 'date-fns';
import { useSearchParams } from 'react-router';
import { companyToday } from '@/lib/company-time';
import { toIsoDate } from '@/lib/format';
import type { LeaveCalendarQuery } from './calendar-api';
import { daysOfRange, stepAnchor, viewRange, type CalendarView } from './calendar-model';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function useCalendarFilters(today: Date = companyToday()) {
  const [params, setParams] = useSearchParams();
  const view: CalendarView = params.get('view') === 'week' ? 'WEEK' : 'MONTH';
  const dateParam = params.get('date') ?? '';
  const parsed = DAY.test(dateParam) ? parseISO(dateParam) : null;
  const anchor = parsed && isValid(parsed) ? parsed : today;
  const unitParam = params.get('unit') ?? '';
  const projectParam = params.get('project') ?? '';
  const orgUnitId = UUID.test(unitParam) ? unitParam : '';
  const projectId = UUID.test(projectParam) ? projectParam : '';

  const range = viewRange(view, anchor);
  const query: LeaveCalendarQuery = { from: toIsoDate(range.from), to: toIsoDate(range.to), orgUnitId, projectId };

  const write = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
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
    activeCount: [orgUnitId, projectId].filter(Boolean).length,
    isCurrent: toIsoDate(viewRange(view, today).from) === toIsoDate(range.from),
    setView: (value: CalendarView) => write({ view: value === 'WEEK' ? 'week' : '' }),
    setUnit: (id: string) => write({ unit: id }),
    setProject: (id: string) => write({ project: id }),
    back: () => goTo(stepAnchor(anchor, view, -1)),
    forward: () => goTo(stepAnchor(anchor, view, 1)),
    toToday: () => write({ date: '' }),
  };
}

export type CalendarFilters = ReturnType<typeof useCalendarFilters>;
