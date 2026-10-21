// How the calendar names the period it shows: "Tháng 10/2026" for a month, "12/10/2026 – 18/10/2026" for a week.
import { format } from 'date-fns';
import type { TFunction } from 'i18next';
import { formatDateRange, toIsoDate } from '@/lib/format';
import type { CalendarView } from './calendar-model';

export function periodLabel(t: TFunction, view: CalendarView, anchor: Date, range: { from: Date; to: Date }): string {
  if (view === 'WEEK') return formatDateRange(toIsoDate(range.from), toIsoDate(range.to));
  return t('shiftCalendar.month', { month: format(anchor, 'M'), year: format(anchor, 'yyyy') });
}
