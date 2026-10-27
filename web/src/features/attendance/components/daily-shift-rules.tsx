// The shift of a day with its rules in one sentence: "Ca đêm 22:00 – 06:00. Qua đêm … Cho phép muộn 5 phút …".
import type { DailyShiftDetail } from '../daily-api';
import { shiftTimes } from './daily-cells';

type T = (key: string, values?: Record<string, unknown>) => string;

export function shiftRules(shift: DailyShiftDetail, t: T) {
  const rounding =
    shift.roundingMode === 'NONE' || !shift.roundingMinutes
      ? null
      : t(`attendanceDaily.rounding.${shift.roundingMode}`, { minutes: shift.roundingMinutes });
  const rules = [
    shift.crossesMidnight ? t('attendanceDaily.rules.overnight') : null,
    t('attendanceDaily.rules.tolerance', { late: shift.lateToleranceMinutes, early: shift.earlyToleranceMinutes }),
    rounding,
  ]
    .filter(Boolean)
    .join('; ');
  return (
    <span className="flex flex-col">
      <span>{`${shift.name} ${shiftTimes({ ...shift }, t).split(' · ')[0]}`}</span>
      <span className="text-caption text-ink-muted">{`${rules}.`}</span>
    </span>
  );
}
