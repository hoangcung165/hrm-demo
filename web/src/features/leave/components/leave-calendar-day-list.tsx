// The people off on one day, in full: name and unit, the type, the half of the day if it is not the whole day, and
// the status as a Badge. Used by the day drawer and the 390 agenda.
import { useTranslation } from 'react-i18next';
import { Person } from '@/components/ui/person';
import type { DayLeave } from '../calendar-model';
import { LeaveStatusBadge } from './leave-status-badge';

export type LeaveCalendarDayListProps = { items: DayLeave[] };

export function LeaveCalendarDayList({ items }: LeaveCalendarDayListProps) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map(({ entry, part }) => (
        <li key={entry.requestId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
          <Person
            name={entry.employee.fullName}
            caption={[entry.leaveType.name, part === 'FULL' ? t('leave.partLong.FULL') : t(`leave.partLong.${part}`), entry.employee.orgUnitName].filter(Boolean).join(' · ')}
            className="min-w-0 flex-1"
          />
          <LeaveStatusBadge status={entry.status} />
        </li>
      ))}
    </ul>
  );
}
