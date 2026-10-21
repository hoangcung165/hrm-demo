// The calendar on a desktop: people down the side, the days of the range across. The header and the first column stay in
// place while the rest scrolls inside the container. A cell with a shift is a button that opens that day.
import { useTranslation } from 'react-i18next';
import { Person } from '@/components/ui/person';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ShiftCalendar } from '../calendar-api';
import { isoOf, type CalendarIndex } from '../calendar-model';
import { ShiftCalendarHead } from './shift-calendar-head';
import { ShiftMark, shiftMarkText } from './shift-mark';

export type ShiftCalendarGridProps = {
  caption: string;
  calendar: ShiftCalendar;
  index: CalendarIndex;
  days: Date[];
  today: Date;
  /** The day whose drawer is open, `yyyy-MM-dd`. */
  openDay: string | null;
  onOpen: (iso: string) => void;
};

export function ShiftCalendarGrid({ caption, calendar, index, days, today, openDay, onOpen }: ShiftCalendarGridProps) {
  const { t } = useTranslation();
  const todayIso = isoOf(today);
  const dim = (iso: string) => {
    const day = index.days.get(iso);
    return Boolean(day?.holiday) || day?.dayKind === 'OFF';
  };
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="max-h-[70vh] overflow-auto rounded-md border border-line bg-surface focus-visible:shadow-focus-ring">
      <table className="w-max min-w-full border-separate border-spacing-0">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-20">
          <tr>
            <th scope="col" className="sticky left-0 z-30 w-60 min-w-60 max-w-60 border-r border-b border-line bg-surface-muted px-3 py-2 text-left text-body-strong text-ink">
              {t('shiftCalendar.leadHeader')}
            </th>
            {days.map((date) => {
              const iso = isoOf(date);
              return <ShiftCalendarHead key={iso} date={date} iso={iso} day={index.days.get(iso)} today={iso === todayIso} open={iso === openDay} onOpen={onOpen} />;
            })}
          </tr>
        </thead>
        <tbody>
          {calendar.rows.map((row) => (
            <tr key={row.employee.id}>
              <th scope="row" className="sticky left-0 z-10 w-60 min-w-60 max-w-60 border-r border-b border-line bg-surface px-3 py-2 text-left font-normal">
                <Person name={row.employee.fullName} caption={[row.employee.code, row.employee.orgUnitName].filter(Boolean).join(' · ')} />
              </th>
              {days.map((date) => {
                const iso = isoOf(date);
                const cell = index.cells.get(row.employee.id)?.get(iso);
                const shift = cell ? index.shifts.get(cell.shiftId) : undefined;
                return (
                  <td key={iso} className={cn('h-12 border-b border-line p-1 text-center', dim(iso) && 'bg-surface-muted', iso === openDay && 'bg-brand-blue-soft')}>
                    {cell && shift ? (
                      <button
                        type="button"
                        aria-label={`${row.employee.fullName}, ${formatDate(iso)}: ${shiftMarkText(t, shift, cell.source)}`}
                        onClick={() => onOpen(iso)}
                        className="inline-flex max-w-full cursor-pointer rounded-sm focus-visible:shadow-focus-ring"
                      >
                        <ShiftMark shift={shift} source={cell.source} />
                      </button>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
