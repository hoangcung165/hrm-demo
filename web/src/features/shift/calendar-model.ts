// The calendar's days and who works which shift on each: pure functions over what the API returns, so the grid, the
// agenda and the day drawer (and their tests) read the same thing.
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { toIsoDate } from '@/lib/format';
import type { CalendarCell, CalendarDay, CalendarRow, CalendarShift, CellSource, ShiftCalendar } from './calendar-api';
import type { EmployeeCard } from '@/features/approval/api';

export type { CalendarView } from '@/features/leave/calendar-model';
export { daysOfRange, stepAnchor } from '@/features/leave/calendar-model';

/** A week is Monday to Sunday; a month is exactly its days (the grid has no padding from the months around it). */
export function shiftViewRange(view: 'WEEK' | 'MONTH', anchor: Date): { from: Date; to: Date } {
  if (view === 'WEEK') return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) };
  return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
}

export type CalendarIndex = {
  days: Map<string, CalendarDay>;
  shifts: Map<string, CalendarShift>;
  /** Employee id → date → the cell. */
  cells: Map<string, Map<string, CalendarCell>>;
};

export function indexShiftCalendar(calendar: ShiftCalendar | undefined): CalendarIndex {
  const cells = new Map<string, Map<string, CalendarCell>>();
  for (const row of calendar?.rows ?? []) cells.set(row.employee.id, new Map(row.cells.map((cell) => [cell.date, cell])));
  return {
    days: new Map((calendar?.days ?? []).map((day) => [day.date, day])),
    shifts: new Map((calendar?.shifts ?? []).map((shift) => [shift.id, shift])),
    cells,
  };
}

/** The shifts of a day with the people who work each, shifts by start time then code, people in the order of the rows. */
export type ShiftGroup = { shift: CalendarShift; people: Array<{ employee: EmployeeCard; source: CellSource }> };

export function groupByShift(rows: CalendarRow[], shifts: CalendarShift[], date: string): ShiftGroup[] {
  const byId = new Map(shifts.map((shift) => [shift.id, shift]));
  const groups = new Map<string, ShiftGroup>();
  for (const row of rows) {
    const cell = row.cells.find((each) => each.date === date);
    const shift = cell ? byId.get(cell.shiftId) : undefined;
    if (!cell || !shift) continue;
    const group = groups.get(shift.id) ?? { shift, people: [] };
    group.people.push({ employee: row.employee, source: cell.source });
    groups.set(shift.id, group);
  }
  return [...groups.values()].sort((a, b) => a.shift.startTime.localeCompare(b.shift.startTime) || a.shift.code.localeCompare(b.shift.code));
}

export const isoOf = (day: Date) => toIsoDate(day);
