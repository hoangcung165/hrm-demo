// Who else of the sender's unit has a request holding days in the same range (waiting or approved), so the approver
// sees the team's cover.
import { useTranslation } from 'react-i18next';
import { Person } from '@/components/ui/person';
import type { LeaveAbsence } from '../api';
import { formatSpan } from '../leave-format';
import { LeaveStatusBadge } from './leave-status-badge';

export type LeaveAbsenceListProps = { absences: LeaveAbsence[]; unit: string | null };

export function LeaveAbsenceList({ absences, unit }: LeaveAbsenceListProps) {
  const { t } = useTranslation();
  if (!absences.length) return <p className="text-body-small text-ink-muted">{t('leave.approval.nobodyOff', { unit: unit ?? '' })}</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {absences.map((absence) => (
        <li key={`${absence.employee.id}-${absence.startDate}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0">
          <Person name={absence.employee.fullName} caption={`${absence.leaveType.name} · ${formatSpan(t, absence.startDate, absence.startPart, absence.endDate, absence.endPart)}`} className="min-w-0 flex-1" />
          <LeaveStatusBadge status={absence.status} />
        </li>
      ))}
    </ul>
  );
}
