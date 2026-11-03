import { manualData } from '@/test/attendance-manual-handlers';
import { cellOf, entriesIn, initialValues, requestOf, weekDays } from './manual-model';

const UNIT = '00000000-0000-4000-8000-000000000002';

describe('manual-model', () => {
  const [an, binh] = manualData().rows as [NonNullable<ReturnType<typeof manualData>['rows'][0]>, NonNullable<ReturnType<typeof manualData>['rows'][1]>];

  it('stops the week at today: days after it take no entry', () => {
    expect(weekDays('2026-10-12', '2026-10-14')).toEqual({ days: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'], last: '2026-10-14' });
    expect(weekDays('2026-10-12', '2026-10-30').last).toBe('2026-10-18');
    expect(weekDays('2026-10-12', '2026-10-11').last).toBeNull();
  });

  it('tells what each cell holds', () => {
    expect(cellOf(an, '2026-10-12', '2026-10-30')).toMatchObject({ state: 'entry', entry: { kind: 'FULL' } });
    expect(cellOf(binh, '2026-10-12', '2026-10-30')).toEqual({ state: 'empty' });
    expect(cellOf(binh, '2026-10-14', '2026-10-30')).toEqual({ state: 'noShift' });
    expect(cellOf(binh, '2026-10-17', '2026-10-30')).toEqual({ state: 'noShift' });
    expect(cellOf(binh, '2026-10-15', '2026-10-14')).toEqual({ state: 'future' });
  });

  it('turns each scope into the target and days of the request', () => {
    expect(requestOf({ kind: 'cell', row: an, date: '2026-10-13' }, UNIT, '2026-10-12', '2026-10-18')).toEqual({ employeeIds: [an.employee.id], from: '2026-10-13', to: '2026-10-13' });
    expect(requestOf({ kind: 'row', row: an }, UNIT, '2026-10-12', '2026-10-16')).toEqual({ employeeIds: [an.employee.id], from: '2026-10-12', to: '2026-10-16' });
    expect(requestOf({ kind: 'day', date: '2026-10-14' }, UNIT, '2026-10-12', '2026-10-18')).toEqual({ orgUnitId: UNIT, from: '2026-10-14', to: '2026-10-14' });
    expect(requestOf({ kind: 'all' }, UNIT, '2026-10-12', '2026-10-18')).toEqual({ orgUnitId: UNIT, from: '2026-10-12', to: '2026-10-18' });
  });

  it('opens the form with the one entry of the scope, else Đủ công', () => {
    const rows = [an, binh];
    expect(initialValues(entriesIn({ kind: 'cell', row: an, date: '2026-10-13' }, rows, '2026-10-12', '2026-10-18'))).toEqual({ kind: 'TIMES', in: '08:20', out: '17:00', note: '' });
    expect(entriesIn({ kind: 'row', row: an }, rows, '2026-10-12', '2026-10-18')).toHaveLength(2);
    expect(initialValues(entriesIn({ kind: 'row', row: an }, rows, '2026-10-12', '2026-10-18'))).toEqual({ kind: 'FULL', in: '08:00', out: '17:00', note: '' });
    expect(entriesIn({ kind: 'day', date: '2026-10-12' }, rows, '2026-10-12', '2026-10-18').map((entry) => entry.note)).toEqual(['Đi công tác']);
  });
});
