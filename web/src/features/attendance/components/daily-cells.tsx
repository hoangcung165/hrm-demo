// Small pieces of a day that the table, the agenda and the drawer share: its label, its shift and its In / Out times.
import { Moon, Smartphone, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { companyDateIso, formatCompanyTime, formatDayMonth } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DailyDay, DailyShift, PunchOrigin } from '../daily-api';

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

/** The phone icon of a time made by phone (HRM-39); it is a picture with a name, so a screen reader says it too. */
export function ByPhoneIcon({ className }: { className?: string }) {
  const { t } = useTranslation();
  return <Smartphone role="img" aria-label={t('attendanceDaily.byPhone')} className={cn('size-4 shrink-0 stroke-[1.5] text-ink-muted', className)} />;
}

/**
 * The time of a punch, with a phone icon beside it when the punch was made by phone; "ngày 13/10" under it when it falls
 * on another day than the shift's (a night shift's Out).
 */
export function PunchTime({ value, day, missing, origin = null }: { value: string | null; day: string; missing: boolean; origin?: PunchOrigin | null }) {
  const { t } = useTranslation();
  if (!value) return missing ? <span className="font-medium text-danger">{t('attendanceDaily.missing')}</span> : <span className="text-ink-muted">–</span>;
  const date = companyDateIso(value);
  return (
    <>
      <span className="inline-flex items-center gap-1">
        {origin === 'MOBILE' ? <ByPhoneIcon /> : null}
        {formatCompanyTime(value)}
      </span>
      {date !== day ? <span className="block text-caption text-ink-muted">{t('attendanceDaily.onDay', { date: formatDayMonth(date) })}</span> : null}
    </>
  );
}

export const isMissing = (day: DailyDay, which: 'IN' | 'OUT') => day.flags.includes(which === 'IN' ? 'MISSING_IN' : 'MISSING_OUT');
