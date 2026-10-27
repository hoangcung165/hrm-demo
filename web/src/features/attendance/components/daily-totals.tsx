// One person's group row of the table and the agenda: avatar, name (a link to the profile), code and unit, and the
// totals of the whole range ("4 ngày đi làm · 1 muộn · 1 vắng"); a total of 0 stays out, except the worked days.
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/avatar';
import { formatNumber } from '@/lib/format';
import type { DailyRow } from '../daily-api';

export function totalsText(totals: DailyRow['totals'], t: (key: string, values?: Record<string, unknown>) => string): string {
  const part = (key: string, n: number) => (n > 0 ? t(`attendanceDaily.totals.${key}`, { n: formatNumber(n), count: n }) : null);
  return [
    t('attendanceDaily.totals.worked', { n: formatNumber(totals.workedDays), count: totals.workedDays }),
    part('late', totals.lateDays),
    part('early', totals.earlyLeaveDays),
    part('missing', totals.missingPunchDays),
    part('absent', totals.absentDays),
    part('leave', totals.leaveDays),
  ]
    .filter(Boolean)
    .join(' · ');
}

export function DailyPerson({ row, size = 'sm', withTotals = false }: { row: DailyRow; size?: 'sm' | 'md'; /** Reads the totals out too, where no visible text carries them (the agenda). */ withTotals?: boolean }) {
  const { t } = useTranslation();
  const { employee } = row;
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar name={employee.fullName} size={size} />
      <span className="flex min-w-0 flex-col">
        <Link to={`/employees/${employee.id}`} className="truncate font-medium text-ink no-underline hover:underline">
          {employee.fullName}
        </Link>
        <span className="truncate text-caption text-ink-muted tabular-nums">{[employee.code, employee.orgUnitName].filter(Boolean).join(' · ')}</span>
      </span>
      {withTotals ? <span className="sr-only">{totalsText(row.totals, t)}</span> : null}
    </span>
  );
}

export function DailyTotals({ row }: { row: DailyRow }) {
  const { t } = useTranslation();
  return <span className="text-body-small text-ink-muted max-md:hidden">{totalsText(row.totals, t)}</span>;
}
