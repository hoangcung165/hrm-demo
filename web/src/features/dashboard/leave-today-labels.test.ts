import i18n from '@/i18n';
import type { LeaveTodayEntry } from './leave-today-api';
import { leavePartLabel } from './leave-today-labels';

const t = i18n.t.bind(i18n);
const entry = (part: LeaveTodayEntry['part'], until: string) => ({ part, until }) as LeaveTodayEntry;

describe('leavePartLabel', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('vi');
  });

  it('names the part of the day for a request that ends today', () => {
    expect(leavePartLabel(t, entry('FULL', '2026-10-30'), '2026-10-30')).toBe('cả ngày');
    expect(leavePartLabel(t, entry('MORNING', '2026-10-30'), '2026-10-30')).toBe('buổi sáng');
    expect(leavePartLabel(t, entry('AFTERNOON', '2026-10-30'), '2026-10-30')).toBe('buổi chiều');
  });

  it('adds the last day when the request goes on, with the year only when it is another one', () => {
    expect(leavePartLabel(t, entry('FULL', '2026-11-03'), '2026-10-30')).toBe('cả ngày, đến 03/11');
    expect(leavePartLabel(t, entry('AFTERNOON', '2026-11-03'), '2026-10-30')).toBe('buổi chiều, đến 03/11');
    expect(leavePartLabel(t, entry('FULL', '2027-03-02'), '2026-10-30')).toBe('cả ngày, đến 02/03/2027');
  });
});
