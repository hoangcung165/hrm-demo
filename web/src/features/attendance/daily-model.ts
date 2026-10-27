// What the Công theo ngày screen computes from the API's rows: the default week, stepping a range, hours as h:mm, and
// the marks of a day (each is text with an icon, never colour alone).
import { addDays, differenceInCalendarDays, parseISO, startOfWeek } from 'date-fns';
import { toIsoDate } from '@/lib/format';
import type { DailyDay, DailyShift, DayFlag } from './daily-api';

export type MarkTone = 'warning' | 'danger' | 'neutral';
export type MarkIcon = 'clock' | 'log-out' | 'alert' | 'copy' | 'leave' | 'holiday' | 'no-shift' | 'no-log';
/** `key` selects the text (`attendanceDaily.mark.<key>`); `abnormal` marks count for "Chỉ ngày bất thường". */
export type Mark = { key: string; tone: MarkTone; icon: MarkIcon; abnormal: boolean; values?: Record<string, string | number> };

/** Monday to Sunday of the week that holds `day`. */
export function weekOf(day: Date): { from: Date; to: Date } {
  const from = startOfWeek(day, { weekStartsOn: 1 });
  return { from, to: addDays(from, 6) };
}

/** The range moved back or forward by its own length (a week stays a week). */
export function stepRange(from: string, to: string, direction: -1 | 1): { from: string; to: string } {
  const length = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  return { from: toIsoDate(addDays(parseISO(from), direction * length)), to: toIsoDate(addDays(parseISO(to), direction * length)) };
}

export const rangeLength = (from: string, to: string) => differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;

/** 445 → "7:25". */
export function formatHours(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** The marks of a day, in the order they read: the abnormal ones first. A day the log does not cover yet says only that. */
export function marksOf(day: DailyDay): Mark[] {
  if (day.noLog && !day.flags.includes('HOLIDAY') && !day.flags.includes('LEAVE')) return [{ key: 'noLog', tone: 'neutral', icon: 'no-log', abnormal: false }];
  const has = (flag: DayFlag) => day.flags.includes(flag);
  const marks: Mark[] = [];
  if (day.lateMinutes > 0) marks.push({ key: 'late', tone: 'warning', icon: 'clock', abnormal: true, values: { minutes: day.lateMinutes } });
  if (day.earlyLeaveMinutes > 0) marks.push({ key: 'early', tone: 'warning', icon: 'log-out', abnormal: true, values: { minutes: day.earlyLeaveMinutes } });
  if (has('MISSING_IN')) marks.push({ key: 'missingIn', tone: 'danger', icon: 'alert', abnormal: true });
  if (has('MISSING_OUT')) marks.push({ key: 'missingOut', tone: 'danger', icon: 'alert', abnormal: true });
  if (has('ABSENT')) marks.push({ key: 'absent', tone: 'danger', icon: 'alert', abnormal: true });
  if (has('LEAVE')) marks.push({ key: `leave${day.leave === 'MORNING' ? 'Morning' : day.leave === 'AFTERNOON' ? 'Afternoon' : ''}`, tone: 'neutral', icon: 'leave', abnormal: false });
  if (has('HOLIDAY')) marks.push({ key: 'holiday', tone: 'neutral', icon: 'holiday', abnormal: false, values: { name: day.holiday ?? '' } });
  if (has('NO_SHIFT')) marks.push({ key: 'noShift', tone: 'neutral', icon: 'no-shift', abnormal: false });
  if (has('DUPLICATE_PUNCH')) marks.push({ key: 'duplicate', tone: 'neutral', icon: 'copy', abnormal: false });
  return marks;
}

export const shiftById = (shifts: DailyShift[]) => new Map(shifts.map((shift) => [shift.id, shift]));
