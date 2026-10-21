import { describe, expect, it } from 'vitest';
import type { ShiftCalendar } from './calendar-api';
import { previewAssign, previewClear, weekdayOf } from './assign-model';

const HC = 'shift-hc';
const SANG = 'shift-sang';
const person = (id: string) => ({ id, code: id, fullName: id, orgUnitName: null });
const day = (date: string, extra: { holiday?: string; dayKind?: 'FULL' | 'MORNING' | 'OFF' } = {}) => ({ date, holiday: extra.holiday ?? null, dayKind: extra.dayKind ?? ('FULL' as const) });

// Mon 12/10 to Sun 18/10/2026, with the Wednesday a holiday and the weekend off.
const DAYS = [
  day('2026-10-12'),
  day('2026-10-13'),
  day('2026-10-14', { holiday: 'Ngày thử nghiệm' }),
  day('2026-10-15'),
  day('2026-10-16'),
  day('2026-10-17', { dayKind: 'OFF' }),
  day('2026-10-18', { dayKind: 'OFF' }),
];

const calendar = (rows: ShiftCalendar['rows']): ShiftCalendar => ({ from: '2026-10-12', to: '2026-10-18', days: DAYS, shifts: [], rows, total: rows.length, page: 0, size: 500 });
const row = (id: string, cells: Array<[string, string, 'ASSIGNED' | 'DEFAULT']>) => ({ employee: person(id), orgUnitId: null, cells: cells.map(([date, shiftId, source]) => ({ date, shiftId, source })) });

describe('weekdayOf', () => {
  it('names the weekday of a day, Monday first', () => {
    expect(weekdayOf('2026-10-12')).toBe('MONDAY');
    expect(weekdayOf('2026-10-17')).toBe('SATURDAY');
    expect(weekdayOf('2026-10-18')).toBe('SUNDAY');
  });
});

describe('previewAssign', () => {
  const rows = [
    row('an', [['2026-10-12', HC, 'DEFAULT'], ['2026-10-13', HC, 'DEFAULT']]),
    row('binh', [['2026-10-12', SANG, 'ASSIGNED'], ['2026-10-13', HC, 'ASSIGNED']]),
    row('chi', []),
  ];

  it('covers the working days, skips the holiday and the days off, and tells them apart', () => {
    const preview = previewAssign(calendar(rows), null, HC, []);
    // Mon, Tue, Thu, Fri; the Wednesday is a holiday and the weekend is off.
    expect(preview).toMatchObject({ employees: 3, days: 4, skippedHolidays: 1, skippedDaysOff: 2 });
    // An: only the default there, so 4 new. Bình: Monday replaced, Tuesday the same, 2 new. Chi: 4 new.
    expect([preview.created, preview.replaced, preview.unchanged]).toEqual([10, 1, 1]);
  });

  it('counts only the chosen people', () => {
    const preview = previewAssign(calendar(rows), new Set(['binh']), HC, []);
    expect([preview.employees, preview.created, preview.replaced, preview.unchanged]).toEqual([1, 2, 1, 1]);
  });

  it('keeps to the chosen weekdays and reports a skipped day only when its weekday was chosen', () => {
    const preview = previewAssign(calendar(rows), null, HC, ['MONDAY', 'WEDNESDAY', 'SATURDAY']);
    expect(preview).toMatchObject({ days: 1, skippedHolidays: 1, skippedDaysOff: 1 });
  });

  it('is empty for nobody', () => {
    expect(previewAssign(calendar(rows), new Set(), HC, [])).toMatchObject({ employees: 0, created: 0, replaced: 0, unchanged: 0 });
  });
});

describe('previewClear', () => {
  it('counts the assigned shifts only: the default shift is not a Phân ca', () => {
    const rows = [row('an', [['2026-10-12', HC, 'DEFAULT']]), row('binh', [['2026-10-12', SANG, 'ASSIGNED'], ['2026-10-17', SANG, 'ASSIGNED']])];
    expect(previewClear(calendar(rows), null)).toEqual({ employees: 2, removed: 2 });
    expect(previewClear(calendar(rows), new Set(['an']))).toEqual({ employees: 1, removed: 0 });
  });
});
