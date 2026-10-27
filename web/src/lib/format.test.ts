import i18n from '@/i18n';
import { companyDateIso, daysInRange, formatCompanyTime, formatCompanyDateTime, formatDate, formatDateRange, formatDateTime, formatDayMonth, formatDayMonthTime, formatExactNumber, formatRelativeTime, formatFileSize, formatMoney, formatNumber, formatPercent, formatPhone, formatTime, monthsInRange, yearsAndMonths } from './format';

describe('format', () => {
  afterAll(async () => {
    await i18n.changeLanguage('vi');
  });

  it('groups a stored phone number as 0912 345 678 and leaves other text alone', () => {
    expect(formatPhone('0912345678')).toBe('0912 345 678');
    expect(formatPhone('02838123456')).toBe('02838123456');
  });

  it('counts whole years and months between two dates', () => {
    expect(yearsAndMonths('1994-05-24', '2026-10-07')).toEqual({ years: 32, months: 4 });
    expect(yearsAndMonths('2021-08-12', '2026-09-11')).toEqual({ years: 5, months: 0 });
    expect(yearsAndMonths('2027-01-01', '2026-10-07')).toEqual({ years: 0, months: 0 });
  });

  it('formats dates as dd/mm/yyyy', () => {
    expect(formatDate('2026-10-02')).toBe('02/10/2026');
    expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026');
  });

  it('formats compact dates without the year', () => {
    expect(formatDayMonth('2026-10-02')).toBe('02/10');
    expect(formatDayMonthTime(new Date(2026, 9, 8, 16, 5))).toBe('08/10 16:05');
  });

  it('says how long ago something happened', () => {
    const now = new Date(2026, 9, 10, 9, 0);
    expect(formatRelativeTime(new Date(2026, 9, 10, 8, 59, 30), now)).toBe('Vừa xong');
    expect(formatRelativeTime(new Date(2026, 9, 10, 7, 5), now)).toBe('Hôm nay 07:05');
    expect(formatRelativeTime(new Date(2026, 9, 9, 15, 40), now)).toBe('Hôm qua 15:40');
    expect(formatRelativeTime(new Date(2026, 9, 8, 8, 30), now)).toBe('08/10 08:30');
    expect(formatRelativeTime(new Date(2025, 9, 8, 8, 30), now)).toBe('08/10/2025 08:30');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('');
  });

  it('formats time in 24-hour clock', () => {
    expect(formatTime(new Date(2026, 9, 2, 21, 5))).toBe('21:05');
    expect(formatDateTime(new Date(2026, 9, 2, 9, 30))).toBe('02/10/2026 09:30');
  });

  it('formats VND money with dot grouping and the ₫ sign', () => {
    expect(formatMoney(12500000)).toBe('12.500.000 ₫');
    expect(formatMoney(0)).toBe('0 ₫');
    expect(formatMoney(999.6)).toBe('1.000 ₫');
  });

  it('formats percentages and numbers with a decimal comma', () => {
    expect(formatPercent(12.5)).toBe('12,5%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatNumber(21.5)).toBe('21,5');
  });

  it('formats a recorded value exactly, without rounding', () => {
    expect(formatExactNumber(12500000)).toBe('12.500.000');
    expect(formatExactNumber(2.34)).toBe('2,34');
    expect(formatExactNumber(40)).toBe('40');
  });

  it('formats file sizes in B, KB and MB', async () => {
    await i18n.changeLanguage('vi');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(300 * 1024)).toBe('300 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(Math.round(2.4 * 1024 * 1024))).toBe('2,4 MB');
  });

  it('formats file sizes in the UI language; the other formatters stay Vietnamese', async () => {
    await i18n.changeLanguage('en');
    expect(formatFileSize(Math.round(2.4 * 1024 * 1024))).toBe('2.4 MB');
    expect(formatFileSize(1536 * 1024)).toBe('1.5 MB');
    expect(formatNumber(21.5)).toBe('21,5');
    expect(formatMoney(12500000)).toBe('12.500.000 ₫');
  });

  it('formats a date range and counts its days, both ends included', () => {
    expect(formatDateRange('2026-01-01', '2026-01-01')).toBe('01/01/2026');
    expect(formatDateRange('2026-02-16', '2026-02-20')).toBe('16/02 – 20/02/2026');
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('30/12/2026 – 02/01/2027');
    expect(daysInRange('2026-02-16', '2026-02-20')).toBe(5);
    expect(daysInRange('2026-01-01', '2026-01-01')).toBe(1);
  });
});

describe('monthsInRange', () => {
  it('counts the months a range spans, both ends included, rounded to the nearest month', () => {
    expect(monthsInRange('2026-09-01', '2027-03-31')).toBe(7);
    expect(monthsInRange('2026-06-15', '2026-12-15')).toBe(6);
    expect(monthsInRange('2026-10-01', '2026-10-10')).toBe(0);
    expect(monthsInRange('2026-10-01', '2026-10-20')).toBe(1);
  });
});

describe('company clock', () => {
  it('shows an instant in the company zone (UTC+7) whatever the browser zone is', () => {
    expect(formatCompanyDateTime('2026-10-13T01:17:00Z')).toBe('13/10/2026 08:17');
    expect(companyDateIso('2026-10-13T01:17:00Z')).toBe('2026-10-13');
    expect(formatCompanyTime('2026-10-13T08:17:00+07:00')).toBe('08:17');
  });

  it('moves a late evening UTC instant to the next company day', () => {
    expect(formatCompanyDateTime('2026-10-12T18:30:00Z')).toBe('13/10/2026 01:30');
    expect(companyDateIso('2026-10-12T18:30:00Z')).toBe('2026-10-13');
  });
});
