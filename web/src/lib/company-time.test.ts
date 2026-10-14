import { COMPANY_TIME_ZONE, companyToday, companyTodayIso } from './company-time';

describe('company time', () => {
  it('is the company zone', () => {
    expect(COMPANY_TIME_ZONE).toBe('Asia/Ho_Chi_Minh');
  });

  it('is already the next day in Vietnam from 17:00 UTC, as the API sees it', () => {
    expect(companyTodayIso(new Date('2026-10-14T16:59:59Z'))).toBe('2026-10-14');
    expect(companyTodayIso(new Date('2026-10-14T17:00:00Z'))).toBe('2026-10-15');
    expect(companyTodayIso(new Date('2026-10-14T23:30:00Z'))).toBe('2026-10-15');
  });

  it('turns the year over with the company day', () => {
    expect(companyTodayIso(new Date('2026-12-31T18:00:00Z'))).toBe('2027-01-01');
  });

  it('gives a date at local midnight on that day', () => {
    const day = companyToday(new Date('2026-10-14T20:00:00Z'));
    expect([day.getFullYear(), day.getMonth() + 1, day.getDate(), day.getHours()]).toEqual([2026, 10, 15, 0]);
  });
});
