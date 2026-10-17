// The month and week views on a desktop: a table of weeks, Monday first. The month view shows a few people per day
// and says how many more; the week view shows them all. A day opens in the drawer.
import { isSameMonth } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toIsoDate } from '@/lib/format';
import { weeksOf, type CalendarDays, type CalendarView } from '../calendar-model';
import { LeaveCalendarCell } from './leave-calendar-cell';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;
const MONTH_LIMIT = 3;

export type LeaveCalendarGridProps = {
  view: CalendarView;
  days: Date[];
  anchor: Date;
  today: Date;
  index: CalendarDays;
  /** Names the table: the period shown. */
  caption: string;
  onOpen: (iso: string) => void;
};

export function LeaveCalendarGrid({ view, days, anchor, today, index, caption, onOpen }: LeaveCalendarGridProps) {
  const { t } = useTranslation();
  const todayIso = toIsoDate(today);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] table-fixed border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday} scope="col" abbr={t(`leave.weekday.long.${weekday}`)} className="border border-line bg-surface-muted px-2 py-1 text-left text-caption font-semibold text-ink-muted">
                {t(`leave.weekday.short.${weekday}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeksOf(days).map((week) => (
            <tr key={toIsoDate(week[0]!)}>
              {week.map((day) => {
                const iso = toIsoDate(day);
                return (
                  <LeaveCalendarCell
                    key={iso}
                    day={day}
                    iso={iso}
                    leave={index.leave.get(iso) ?? []}
                    holiday={index.holidays.get(iso)}
                    outside={view === 'MONTH' && !isSameMonth(day, anchor)}
                    today={iso === todayIso}
                    limit={view === 'MONTH' ? MONTH_LIMIT : null}
                    onOpen={onOpen}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
