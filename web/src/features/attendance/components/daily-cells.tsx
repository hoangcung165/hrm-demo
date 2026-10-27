// Small pieces of a day that the table, the agenda and the drawer share: its label, its shift and its In / Out times.
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyDateIso, formatCompanyTime, formatDayMonth } from '@/lib/format';
import type { DailyDay, DailyShift } from '../daily-api';

/** "T2 12/10". */
export function dayLabel(date: string, t: (key: string) => string): string {
  return `${t(`leave.weekday.short.${new Date(`${date}T00:00:00`).getDay()}`)} ${formatDayMonth(date)}`;
}

/** "22:00 – 06:00 · qua đêm". */
export function shiftTimes(shift: DailyShift, t: (key: string) => string): string {
  return `${shift.startTime} – ${shift.endTime}${shift.crossesMidnight ? ` · ${t('attendanceDaily.overnight')}` : ''}`;
}

export function ShiftCell({ shift }: { shift: DailyShift | undefined }) {
  const { t } = useTranslation();
  if (!shift) return <span className="text-ink-muted">{t('attendanceDaily.noShift')}</span>;
  const Icon = shift.crossesMidnight ? Moon : Sun;
  return (
    <>
      <span className="inline-flex items-center gap-1">
        <Icon aria-hidden="true" className="size-4 stroke-[1.5] text-ink-muted" />
        {shift.name}
      </span>
      <span className="block text-caption text-ink-muted tabular-nums">{shiftTimes(shift, t)}</span>
    </>
  );
}

/** The time of a punch; "ngày 13/10" under it when it falls on another day than the shift's (a night shift's Out). */
export function PunchTime({ value, day, missing }: { value: string | null; day: string; missing: boolean }) {
  const { t } = useTranslation();
  if (!value) return missing ? <span className="font-medium text-danger">{t('attendanceDaily.missing')}</span> : <span className="text-ink-muted">–</span>;
  const date = companyDateIso(value);
  return (
    <>
      {formatCompanyTime(value)}
      {date !== day ? <span className="block text-caption text-ink-muted">{t('attendanceDaily.onDay', { date: formatDayMonth(date) })}</span> : null}
    </>
  );
}

export const isMissing = (day: DailyDay, which: 'IN' | 'OUT') => day.flags.includes(which === 'IN' ? 'MISSING_IN' : 'MISSING_OUT');
