// The people who work on one day, by shift: each shift with its hours (and "hôm sau" for the end of a night shift)
// and the people under it, a person on the default shift of their unit said in words. Used by the day drawer and
// the 390 agenda.
import { useTranslation } from 'react-i18next';
import { Person } from '@/components/ui/person';
import type { ShiftGroup } from '../calendar-model';
import { ShiftMark } from './shift-mark';

export type ShiftDayGroupsProps = { groups: ShiftGroup[] };

export function ShiftDayGroups({ groups }: ShiftDayGroupsProps) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col gap-4">
      {groups.map(({ shift, people }) => (
        <li key={shift.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ShiftMark shift={shift} source="ASSIGNED" quiet />
            <span className="font-medium">{shift.name}</span>
            <span className="text-body-small text-ink-muted tabular-nums">
              {shift.startTime} – {shift.crossesMidnight ? t('shiftCalendar.endsNextDay', { end: shift.endTime }) : shift.endTime}
            </span>
            <span className="text-body-small text-ink-muted">· {t('shiftCalendar.peopleCount', { count: people.length })}</span>
          </div>
          <ul className="flex flex-col divide-y divide-line">
            {people.map(({ employee, source }) => (
              <li key={employee.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
                <Person name={employee.fullName} caption={[employee.code, employee.orgUnitName].filter(Boolean).join(' · ')} className="min-w-0 flex-1" />
                {source === 'DEFAULT' ? <span className="text-caption text-ink-muted">{t('shiftCalendar.source.DEFAULT')}</span> : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
