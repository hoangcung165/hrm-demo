// The calendar at 390: a list of the days that have someone off or a holiday, each with the people in full. A grid
// of seven columns does not fit a phone, and an empty day would only be scrolling.
import { useTranslation } from 'react-i18next';
import { formatDate, toIsoDate } from '@/lib/format';
import type { CalendarDays } from '../calendar-model';
import { LeaveCalendarDayList } from './leave-calendar-day-list';

export type LeaveCalendarAgendaProps = { days: Date[]; index: CalendarDays; today: Date; label: string };

export function LeaveCalendarAgenda({ days, index, today, label }: LeaveCalendarAgendaProps) {
  const { t } = useTranslation();
  const todayIso = toIsoDate(today);
  const busy = days.map((day) => toIsoDate(day)).filter((iso) => index.leave.has(iso) || index.holidays.has(iso));
  if (!busy.length) return <p className="text-body-small text-ink-muted">{t('leave.calendar.agendaEmpty')}</p>;
  return (
    <ol aria-label={label} className="flex flex-col gap-4">
      {busy.map((iso) => {
        const date = new Date(`${iso}T00:00:00`);
        const holiday = index.holidays.get(iso);
        return (
          <li key={iso} aria-current={iso === todayIso ? 'date' : undefined} className="flex flex-col gap-2">
            <h3 className="text-body-strong">
              {t(`leave.weekday.long.${date.getDay()}`)}, {formatDate(iso)}
              {iso === todayIso ? <span className="font-normal text-ink-muted"> · {t('leave.calendar.today')}</span> : null}
            </h3>
            {holiday ? <p className="text-body-small font-semibold">{t('leave.calendar.holidayNamed', { name: holiday })}</p> : null}
            <LeaveCalendarDayList items={index.leave.get(iso) ?? []} />
          </li>
        );
      })}
    </ol>
  );
}
