import { formatDate, formatDateTime, formatFileSize, formatMoney, formatNumber, formatPercent, formatTime } from './format';

describe('format', () => {
  it('formats dates as dd/mm/yyyy', () => {
    expect(formatDate('2026-10-02')).toBe('02/10/2026');
    expect(formatDate(new Date(2026, 0, 5))).toBe('05/01/2026');
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

  it('formats file sizes in B, KB and MB', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(300 * 1024)).toBe('300 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(Math.round(2.4 * 1024 * 1024))).toBe('2,4 MB');
  });
});
