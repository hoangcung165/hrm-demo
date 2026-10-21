// The calendar at 390: a list of the days that have someone on a shift or a holiday, each with the shifts and the people
// under them in full. A grid of days does not fit a phone, and an empty day would only be scrolling.
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import type { ShiftCalendar } from '../calendar-api';
import { groupByShift, isoOf, type CalendarIndex } from '../calendar-model';
import { ShiftDayGroups } from './shift-day-groups';

export type ShiftCalendarAgendaProps = { calendar: ShiftCalendar; index: CalendarIndex; days: Date[]; today: Date; label: string };

export function ShiftCalendarAgenda({ calendar, index, days, today, label }: ShiftCalendarAgendaProps) {
  const { t } = useTranslation();
  const todayIso = isoOf(today);
  const entries = days
    .map((date) => ({ date, iso: isoOf(date) }))
    .map((day) => ({ ...day, groups: groupByShift(calendar.rows, calendar.shifts, day.iso), holiday: index.days.get(day.iso)?.holiday ?? null }))
    .filter((day) => day.groups.length > 0 || day.holiday);
  if (!entries.length) return <p className="text-body-small text-ink-muted">{t('shiftCalendar.agendaEmpty')}</p>;
  return (
    <ol aria-label={label} className="flex flex-col gap-5">
      {entries.map(({ date, iso, groups, holiday }) => (
        <li key={iso} aria-current={iso === todayIso ? 'date' : undefined} className="flex flex-col gap-2">
          <h3 className="text-body-strong">
            {t(`leave.weekday.long.${date.getDay()}`)}, {formatDate(iso)}
            {iso === todayIso ? <span className="font-normal text-ink-muted"> · {t('shiftCalendar.today')}</span> : null}
          </h3>
          {holiday ? <p className="text-body-small font-semibold">{t('shiftCalendar.holidayNamed', { name: holiday })}</p> : null}
          <ShiftDayGroups groups={groups} />
        </li>
      ))}
    </ol>
  );
}
