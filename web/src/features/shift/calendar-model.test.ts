import type { CalendarRow } from './calendar-api';
import { groupByShift, indexShiftCalendar, shiftViewRange } from './calendar-model';
import { isoOf } from './calendar-model';
import { AN, HUNG, SHIFT_BRIEFS, TRI } from '@/test/shift-calendar-handlers';
import { CA_DEM, CA_SANG, HANH_CHINH } from '@/test/shift-fixtures';

const rows: CalendarRow[] = [
  { employee: TRI, orgUnitId: null, cells: [{ date: '2026-10-12', shiftId: CA_DEM.id, source: 'ASSIGNED' }] },
  { employee: AN, orgUnitId: null, cells: [{ date: '2026-10-12', shiftId: HANH_CHINH.id, source: 'DEFAULT' }, { date: '2026-10-13', shiftId: HANH_CHINH.id, source: 'DEFAULT' }] },
  { employee: HUNG, orgUnitId: null, cells: [{ date: '2026-10-12', shiftId: CA_SANG.id, source: 'ASSIGNED' }] },
];

describe('shiftViewRange', () => {
  it('shows a week from Monday to Sunday and a month as exactly its days', () => {
    const week = shiftViewRange('WEEK', new Date(2026, 9, 14));
    expect([isoOf(week.from), isoOf(week.to)]).toEqual(['2026-10-12', '2026-10-18']);
    const month = shiftViewRange('MONTH', new Date(2026, 9, 14));
    expect([isoOf(month.from), isoOf(month.to)]).toEqual(['2026-10-01', '2026-10-31']);
  });
});

describe('groupByShift', () => {
  it('groups the people of a day by shift, earliest start first, and keeps where each shift came from', () => {
    const groups = groupByShift(rows, SHIFT_BRIEFS, '2026-10-12');
    expect(groups.map((group) => group.shift.code)).toEqual(['SANG', 'HC', 'DEM']);
    expect(groups[1]!.people).toEqual([{ employee: AN, source: 'DEFAULT' }]);
    expect(groups[2]!.shift.crossesMidnight).toBe(true);
  });

  it('leaves out the people with no shift that day', () => {
    expect(groupByShift(rows, SHIFT_BRIEFS, '2026-10-13').map((group) => group.shift.code)).toEqual(['HC']);
    expect(groupByShift(rows, SHIFT_BRIEFS, '2026-10-14')).toEqual([]);
  });
});

describe('indexShiftCalendar', () => {
  it('finds a cell by person and day', () => {
    const index = indexShiftCalendar({ from: '2026-10-12', to: '2026-10-13', days: [{ date: '2026-10-12', holiday: 'Nghỉ', dayKind: 'FULL' }], shifts: SHIFT_BRIEFS, rows, total: 3, page: 0, size: 25 });
    expect(index.cells.get(AN.id)?.get('2026-10-13')?.shiftId).toBe(HANH_CHINH.id);
    expect(index.cells.get(TRI.id)?.get('2026-10-13')).toBeUndefined();
    expect(index.days.get('2026-10-12')?.holiday).toBe('Nghỉ');
    expect(indexShiftCalendar(undefined).cells.size).toBe(0);
  });
});
