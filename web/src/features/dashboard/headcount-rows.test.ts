import i18n from '@/i18n';
import { HEADCOUNT } from '@/test/dashboard-headcount-handlers';
import { flowTotals, monthPeriods, totalOf, unitRows } from './headcount-rows';

const t = i18n.t.bind(i18n);

describe('headcount rows', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('vi');
  });

  it('links a unit to the Employees who belong to it directly, and leaves "directly under the company" without a link', () => {
    const rows = unitRows(t, HEADCOUNT.byUnit);
    expect(rows[0]).toMatchObject({ label: 'Nhóm Web', value: 59, to: expect.stringContaining('includeSubUnits=false') });
    expect(rows[0]!.to).toContain('orgUnitId=00000000-0000-4000-8000-000000000001');
    expect(rows[3]).toMatchObject({ label: 'Trực thuộc công ty', value: 1 });
    expect(rows[3]!.to).toBeUndefined();
  });

  it('keeps 7 units and groups the rest as "Khác" past 8 rows', () => {
    const units = Array.from({ length: 10 }, (_, i) => ({ orgUnitId: `u${i}`, orgUnitName: `Đơn vị ${i}`, count: 10 - i }));
    const rows = unitRows(t, units);
    expect(rows).toHaveLength(8);
    expect(rows[6]!.label).toBe('Đơn vị 6');
    expect(rows[7]).toMatchObject({ label: 'Khác', value: 3 + 2 + 1 });
    expect(rows[7]!.to).toBeUndefined();
    expect(rows.reduce((sum, row) => sum + row.value, 0)).toBe(totalOf(units));
  });

  it('turns six months into periods with a sentence each, the last one current, and the totals for the chart name', () => {
    const periods = monthPeriods(t, HEADCOUNT.months);
    expect(periods).toHaveLength(6);
    expect(periods[0]).toMatchObject({ short: 'T05', full: 'Tháng 05/2026', a: 4, b: 1, current: false, sentence: 'Tháng 05/2026: 4 vào làm, 1 nghỉ việc' });
    expect(periods[5]!.current).toBe(true);
    expect(flowTotals(HEADCOUNT.months)).toEqual({ joins: 27, leaves: 7 });
  });
});
