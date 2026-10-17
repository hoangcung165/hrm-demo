// One day of the month or week grid: the date (a button that opens the day), the holiday's name, and the people off
// as pills. A month cell shows a few and says how many more; the week view shows them all.
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DayLeave } from '../calendar-model';
import { LeaveCalendarPill } from './leave-calendar-pill';

export type LeaveCalendarCellProps = {
  day: Date;
  iso: string;
  leave: DayLeave[];
  holiday: string | undefined;
  /** Another month than the one shown, in the month view. */
  outside: boolean;
  today: boolean;
  /** How many pills show before "+N"; `null` shows all. */
  limit: number | null;
  onOpen: (iso: string) => void;
};

export function LeaveCalendarCell({ day, iso, leave, holiday, outside, today, limit, onOpen }: LeaveCalendarCellProps) {
  const { t } = useTranslation();
  const weekend = day.getDay() === 0 || day.getDay() === 6;
  const shown = limit === null ? leave : leave.slice(0, limit);
  const more = leave.length - shown.length;
  const label = [t(`leave.weekday.long.${day.getDay()}`), formatDate(iso), holiday ?? null, leave.length ? t('leave.calendar.peopleOff', { count: leave.length }) : null].filter(Boolean).join(', ');
  return (
    <td className={cn('h-full min-w-0 border border-line p-1 align-top', (weekend || holiday) && 'bg-surface-muted', outside && 'text-ink-muted')}>
      <div className="flex min-h-24 flex-col gap-1">
        <button
          type="button"
          aria-label={label}
          aria-current={today ? 'date' : undefined}
          onClick={() => onOpen(iso)}
          className={cn('inline-flex h-7 min-w-7 cursor-pointer items-center justify-center self-start rounded-full px-1 text-body-small tabular-nums hover:bg-brand-blue-soft focus-visible:shadow-focus-ring', today && 'bg-brand-blue font-semibold text-surface hover:bg-brand-blue')}
        >
          {format(day, 'd')}
        </button>
        {holiday ? <p className="text-caption font-semibold [overflow-wrap:anywhere]">{t('leave.calendar.holidayNamed', { name: holiday })}</p> : null}
        {shown.length ? (
          <ul className="flex flex-col gap-1">
            {shown.map((item) => (
              <LeaveCalendarPill key={item.entry.requestId} leave={item} />
            ))}
          </ul>
        ) : null}
        {more > 0 ? <p className="text-caption text-ink-muted">{t('leave.calendar.more', { count: more })}</p> : null}
      </div>
    </td>
  );
}
