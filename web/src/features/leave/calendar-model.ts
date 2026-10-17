// The calendar's days and who is off on each: pure functions over what the API returns, so the grid and the agenda
// (and their tests) read the same thing.
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { toIsoDate } from '@/lib/format';
import type { DayPart } from './api';
import type { LeaveCalendar, LeaveCalendarEntry } from './calendar-api';

export type CalendarView = 'WEEK' | 'MONTH';

/** The days a view shows around `anchor`: Monday to Sunday weeks, a month padded to whole weeks (at most 42 days). */
export function viewRange(view: CalendarView, anchor: Date): { from: Date; to: Date } {
  if (view === 'WEEK') return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) };
  return { from: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }), to: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }) };
}

export const daysOfRange = (range: { from: Date; to: Date }): Date[] => eachDayOfInterval({ start: range.from, end: range.to });

/** The days split into weeks of seven. */
export function weeksOf(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/** One person's leave on one day. `part` is FULL when both halves are off. */
export type DayLeave = { entry: LeaveCalendarEntry; part: DayPart };

export type CalendarDays = {
  holidays: Map<string, string>;
  leave: Map<string, DayLeave[]>;
};

/** Indexes the entries by day, people in name order, a day with neither half off left out. */
export function indexCalendar(calendar: LeaveCalendar | undefined): CalendarDays {
  const holidays = new Map((calendar?.holidays ?? []).map((holiday) => [holiday.date, holiday.name]));
  const leave = new Map<string, DayLeave[]>();
  for (const entry of calendar?.entries ?? []) {
    for (const day of entry.days) {
      if (!day.morning && !day.afternoon) continue;
      const part: DayPart = day.morning && day.afternoon ? 'FULL' : day.morning ? 'MORNING' : 'AFTERNOON';
      leave.set(day.date, [...(leave.get(day.date) ?? []), { entry, part }]);
    }
  }
  for (const list of leave.values()) list.sort((a, b) => a.entry.employee.fullName.localeCompare(b.entry.employee.fullName, 'vi') || a.entry.requestId.localeCompare(b.entry.requestId));
  return { holidays, leave };
}

export const isoOf = (day: Date) => toIsoDate(day);
export const parseDay = (iso: string) => parseISO(iso);
export const stepAnchor = (anchor: Date, view: CalendarView, by: number) => (view === 'WEEK' ? addDays(anchor, 7 * by) : new Date(anchor.getFullYear(), anchor.getMonth() + by, 1));
