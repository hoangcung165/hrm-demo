// The drawer a day opens: the holiday, if any, and who works which shift that day, in full. It asks for the one day
// itself (up to 500 people), so it is complete whatever page of the grid is open. Non-modal like the other drawers; Esc
// closes it and focus goes back to the day.
import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { formatDate, formatNumber } from '@/lib/format';
import { CALENDAR_MAX_SIZE, useShiftCalendar, type ShiftCalendarQuery } from '../calendar-api';
import { groupByShift } from '../calendar-model';
import { ShiftDayGroups } from './shift-day-groups';

export type ShiftCalendarDayDrawerProps = {
  /** The day that is open, `yyyy-MM-dd`; `null` closes the drawer. */
  day: string | null;
  /** The filters of the calendar; the drawer lists the same people for the one day. */
  query: ShiftCalendarQuery;
  onClose: () => void;
  /** For an Account that may assign shifts: opens "Phân ca" for this day. */
  onAssign?: (day: string) => void;
};

export function ShiftCalendarDayDrawer({ day, query, onClose, onAssign }: ShiftCalendarDayDrawerProps) {
  const { t } = useTranslation();
  const dayQuery: ShiftCalendarQuery = { ...query, from: day ?? query.from, to: day ?? query.to, page: 0, size: CALENDAR_MAX_SIZE };
  const calendar = useShiftCalendar(dayQuery, day !== null);
  const date = day ? new Date(`${day}T00:00:00`) : null;
  const data = calendar.data && calendar.data.from === day ? calendar.data : undefined;
  const groups = data ? groupByShift(data.rows, data.shifts, data.from) : [];
  const holiday = data?.days[0]?.holiday ?? null;
  const people = groups.reduce((sum, group) => sum + group.people.length, 0);
  let body;
  if (calendar.isError) body = <ErrorState title={t('shiftCalendar.drawer.loadError')} onRetry={() => void calendar.refetch()} />;
  else if (!data) body = <Loading label={t('shiftCalendar.drawer.loading')} rows={3} />;
  else
    body = (
      <>
        {holiday ? <p className="mb-3 font-semibold">{t('shiftCalendar.holidayNamed', { name: holiday })}</p> : null}
        {groups.length ? <ShiftDayGroups groups={groups} /> : <p className="text-body-small text-ink-muted">{t('shiftCalendar.drawer.empty')}</p>}
        {data.total > CALENDAR_MAX_SIZE ? <p className="mt-3 text-caption text-ink-muted">{t('shiftCalendar.drawer.truncated', { shown: formatNumber(CALENDAR_MAX_SIZE), total: formatNumber(data.total) })}</p> : null}
      </>
    );
  return (
    <Drawer
      open={day !== null}
      onClose={onClose}
      caption={t('shiftCalendar.drawer.caption')}
      title={date && day ? `${t(`leave.weekday.long.${date.getDay()}`)}, ${formatDate(day)}` : ''}
      subtitle={people ? t('shiftCalendar.drawer.people', { count: people }) : undefined}
    >
      {onAssign && day ? (
        <Button variant="secondary" size="sm" className="mb-3" onClick={() => onAssign(day)}>
          <CalendarPlus aria-hidden="true" />
          {t('shiftAssign.actions.assignDay')}
        </Button>
      ) : null}
      {body}
    </Drawer>
  );
}
