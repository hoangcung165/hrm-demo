import { indexCalendar, viewRange, weeksOf, daysOfRange } from './calendar-model';
import type { LeaveCalendar } from './calendar-api';

const person = (n: number, fullName: string) => ({ id: `e-${n}`, code: `NV${n}`, fullName, orgUnitName: null });
const type = { id: 'lt-1', code: 'PN', name: 'Phép năm', active: true };

describe('viewRange', () => {
  it('pads a month to whole weeks, Monday first', () => {
    const { from, to } = viewRange('MONTH', new Date(2026, 9, 17));
    expect([from.getFullYear(), from.getMonth(), from.getDate(), from.getDay()]).toEqual([2026, 8, 28, 1]);
    expect([to.getFullYear(), to.getMonth(), to.getDate(), to.getDay()]).toEqual([2026, 10, 1, 0]);
    expect(weeksOf(daysOfRange({ from, to }))).toHaveLength(5);
  });

  it('is Monday to Sunday for a week, and never more than the 62 days the API takes for a month', () => {
    const week = viewRange('WEEK', new Date(2026, 9, 17));
    expect(daysOfRange(week)).toHaveLength(7);
    expect(daysOfRange(viewRange('MONTH', new Date(2026, 1, 1)))).toHaveLength(35);
    expect(daysOfRange(viewRange('MONTH', new Date(2026, 7, 1))).length).toBeLessThanOrEqual(42);
  });
});

describe('indexCalendar', () => {
  const calendar: LeaveCalendar = {
    from: '2026-10-12',
    to: '2026-10-18',
    holidays: [{ date: '2026-10-14', name: 'Nghỉ lễ' }],
    entries: [
      { requestId: 'r2', employee: person(2, 'Vũ Thị Lan'), leaveType: type, status: 'APPROVED', days: [{ date: '2026-10-13', morning: false, afternoon: true }] },
      { requestId: 'r1', employee: person(1, 'Cao Minh Trí'), leaveType: type, status: 'PENDING', days: [{ date: '2026-10-13', morning: true, afternoon: true }, { date: '2026-10-14', morning: false, afternoon: false }] },
    ],
  };

  it('lists the people of a day by name with the half that is off, and leaves out a day with neither half', () => {
    const index = indexCalendar(calendar);
    expect(index.leave.get('2026-10-13')!.map((item) => [item.entry.employee.fullName, item.part])).toEqual([['Cao Minh Trí', 'FULL'], ['Vũ Thị Lan', 'AFTERNOON']]);
    expect(index.leave.has('2026-10-14')).toBe(false);
    expect(index.holidays.get('2026-10-14')).toBe('Nghỉ lễ');
  });

  it('is empty before the calendar has loaded', () => {
    const index = indexCalendar(undefined);
    expect(index.leave.size).toBe(0);
    expect(index.holidays.size).toBe(0);
  });
});
