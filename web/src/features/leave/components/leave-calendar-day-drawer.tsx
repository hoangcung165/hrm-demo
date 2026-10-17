// The drawer a day of the grid opens: the holiday, if any, and everyone off that day with the half and the status.
// Non-modal like the other drawers; Esc closes it and focus goes back to the day.
import { useTranslation } from 'react-i18next';
import { Drawer } from '@/components/ui/drawer';
import { formatDate } from '@/lib/format';
import type { CalendarDays } from '../calendar-model';
import { LeaveCalendarDayList } from './leave-calendar-day-list';

export type LeaveCalendarDayDrawerProps = {
  /** The day that is open, `yyyy-MM-dd`; `null` closes the drawer. */
  day: string | null;
  index: CalendarDays;
  onClose: () => void;
};

export function LeaveCalendarDayDrawer({ day, index, onClose }: LeaveCalendarDayDrawerProps) {
  const { t } = useTranslation();
  const items = day ? (index.leave.get(day) ?? []) : [];
  const holiday = day ? index.holidays.get(day) : undefined;
  const date = day ? new Date(`${day}T00:00:00`) : null;
  return (
    <Drawer
      open={day !== null}
      onClose={onClose}
      caption={t('leave.calendar.dayCaption')}
      title={date && day ? `${t(`leave.weekday.long.${date.getDay()}`)}, ${formatDate(day)}` : ''}
      subtitle={items.length ? t('leave.calendar.peopleOff', { count: items.length }) : undefined}
    >
      {holiday ? <p className="mb-3 font-semibold">{t('leave.calendar.holidayNamed', { name: holiday })}</p> : null}
      {items.length ? <LeaveCalendarDayList items={items} /> : <p className="text-body-small text-ink-muted">{t('leave.calendar.dayEmpty')}</p>}
    </Drawer>
  );
}
