// The rows of the Day breakdown list from the days the check counted: whole working days in a row become one run
// ("16/11 – 20/11 · 5 ngày làm việc · 5"), days off and one holiday in a row too; a half day stays on its own.
import type { TFunction } from 'i18next';
import { formatDayMonth } from '@/lib/format';
import type { DayBreakdownRow } from '@/components/ui/day-breakdown';
import type { LeaveDay } from './api';
import { formatDays, weekdayDay } from './leave-format';

type Run = { kind: string; days: LeaveDay[] };

const runKind = (day: LeaveDay) => {
  if (day.kind === 'HOLIDAY') return `HOLIDAY:${day.holidayName ?? ''}`;
  if (day.kind === 'DAY_OFF') return 'DAY_OFF';
  return day.morning && day.afternoon ? 'FULL' : `HALF:${day.date}`;
};

function label(t: TFunction, run: Run): string {
  const first = run.days[0]!;
  if (first.kind === 'HOLIDAY') return t('leave.breakdown.holiday', { name: first.holidayName ?? t('leave.breakdown.holidayUnnamed') });
  if (first.kind === 'DAY_OFF') return t('leave.breakdown.dayOff');
  if (!(first.morning && first.afternoon)) return t(first.morning ? 'leave.partLabel.MORNING' : 'leave.partLabel.AFTERNOON');
  return run.days.length > 1 ? t('leave.breakdown.workingDays', { count: run.days.length }) : t('leave.partLabel.FULL');
}

export function dayRows(t: TFunction, days: LeaveDay[]): DayBreakdownRow[] {
  const runs: Run[] = [];
  for (const day of days) {
    const kind = runKind(day);
    const last = runs.at(-1);
    if (last && last.kind === kind) last.days.push(day);
    else runs.push({ kind, days: [day] });
  }
  return runs.map((run) => {
    const first = run.days[0]!;
    const end = run.days.at(-1)!;
    const value = run.days.reduce((sum, day) => sum + day.value, 0);
    return {
      key: first.date,
      when: run.days.length > 1 ? `${formatDayMonth(first.date)} – ${formatDayMonth(end.date)}` : weekdayDay(t, first.date),
      label: label(t, run),
      value: formatDays(value),
      muted: first.kind !== 'WORKING',
    };
  });
}
