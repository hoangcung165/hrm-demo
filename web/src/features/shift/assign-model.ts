// What a Phân ca call would do, worked out from the calendar of the range, because the API has no dry run. It follows the
// rule of the backend (`ShiftDaySelection`): a chosen weekday is covered unless it is a holiday or a day off of the
// Lịch làm việc; an existing Phân ca of the same shift stays, another one is replaced, a day with none (or only the
// Ca mặc định) gets a new one.
import { WEEKDAYS, type Weekday } from './assign-api';
import type { ShiftCalendar } from './calendar-api';

export type AssignPreview = {
  employees: number;
  /** Days covered per person. */
  days: number;
  created: number;
  replaced: number;
  unchanged: number;
  skippedHolidays: number;
  skippedDaysOff: number;
};

/** The weekday of a `yyyy-MM-dd` day. */
export function weekdayOf(day: string): Weekday {
  const [year, month, date] = day.split('-').map(Number);
  // getDay(): 0 is Sunday.
  return WEEKDAYS[(new Date(year, month - 1, date).getDay() + 6) % 7];
}

/** `people`: the chosen people, or `null` for every row (a whole unit). `weekdays` empty means every weekday. */
export function previewAssign(calendar: ShiftCalendar, people: ReadonlySet<string> | null, shiftId: string, weekdays: readonly Weekday[]): AssignPreview {
  const rows = calendar.rows.filter((row) => people === null || people.has(row.employee.id));
  const covered: string[] = [];
  let skippedHolidays = 0;
  let skippedDaysOff = 0;
  for (const day of calendar.days) {
    if (weekdays.length > 0 && !weekdays.includes(weekdayOf(day.date))) continue;
    if (day.holiday) skippedHolidays += 1;
    else if (day.dayKind === 'OFF') skippedDaysOff += 1;
    else covered.push(day.date);
  }
  let created = 0;
  let replaced = 0;
  let unchanged = 0;
  for (const row of rows) {
    const own = new Map(row.cells.filter((cell) => cell.source === 'ASSIGNED').map((cell) => [cell.date, cell.shiftId]));
    for (const day of covered) {
      const had = own.get(day);
      if (had === undefined) created += 1;
      else if (had === shiftId) unchanged += 1;
      else replaced += 1;
    }
  }
  return { employees: rows.length, days: covered.length, created, replaced, unchanged, skippedHolidays, skippedDaysOff };
}

/** How many Phân ca of the people a clear would remove: the Ca mặc định is not a Phân ca. */
export function previewClear(calendar: ShiftCalendar, people: ReadonlySet<string> | null): { employees: number; removed: number } {
  const rows = calendar.rows.filter((row) => people === null || people.has(row.employee.id));
  const removed = rows.reduce((sum, row) => sum + row.cells.filter((cell) => cell.source === 'ASSIGNED').length, 0);
  return { employees: rows.length, removed };
}
