import { initialSalaryPeriod, periodPieces, salaryAllowances, salaryPeriodStatus,
  salarySegmentKey, validPeriod } from './salary-period';
import type { SalaryProfileSegment } from './salary-profile-api';

const base: SalaryProfileSegment = {
  from: '2026-10-01', to: '2026-10-15',
  baseSalary: 18_000_000, insuranceSalary: 18_000_000,
  allowancesJson: '[{"name":"Ăn trưa","amount":500000}]',
  insured: true, taxMethod: 'PROGRESSIVE',
  sourceContractId: 'contract-123', sourceAmendmentId: null, overrideReason: null,
};
const raise: SalaryProfileSegment = {
  ...base, from: '2026-10-16', to: '2026-10-31',
  baseSalary: 21_000_000, sourceAmendmentId: 'amendment-789',
};

describe('HRM-10 FE-3 salary period semantics', () => {
  it('defaults to the complete company calendar month, including leap February', () => {
    expect(initialSalaryPeriod('2028-02-16')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(initialSalaryPeriod('2026-10-16')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });
  it('rejects invalid or reverse date ranges before making an API request', () => {
    expect(validPeriod({ from: '2026-10-20', to: '2026-10-19' })).toBe(false);
    expect(validPeriod({ from: '2026-02-30', to: '2026-03-01' })).toBe(false);
    expect(validPeriod({ from: '2026-10-01', to: '2026-10-31' })).toBe(true);
  });
  it('represents mid-month amendment as exactly 15 and 16 paid days', () => {
    const pieces = periodPieces({ from: '2026-10-01', to: '2026-10-31' }, [raise, base]);
    expect(pieces.map(p => [p.kind, p.days, p.from, p.to])).toEqual([
      ['salary', 15, '2026-10-01', '2026-10-15'],
      ['salary', 16, '2026-10-16', '2026-10-31'],
    ]);
    expect(salarySegmentKey(raise)).toContain('amendment-789');
    expect(salarySegmentKey(base)).toContain('contract-123');
  });
  it('keeps uncovered start, middle, and end dates as neutral gaps', () => {
    const pieces = periodPieces({ from: '2026-10-01', to: '2026-10-31' }, [
      { ...base, from: '2026-10-05', to: '2026-10-10' },
      { ...raise, from: '2026-10-20', to: '2026-10-24' },
    ]);
    expect(pieces.map(p => [p.kind, p.days])).toEqual([
      ['gap', 4], ['salary', 6], ['gap', 9], ['salary', 5], ['gap', 7],
    ]);
    expect(pieces.reduce((sum, p) => sum + p.days, 0)).toBe(31);
  });
  it('does not leak salary amounts while parsing allowances or interpreting status', () => {
    expect(salaryAllowances(base.allowancesJson)).toEqual([{ name: 'Ăn trưa', amount: 500000 }]);
    expect(salaryAllowances('[{"amount":12}]')).toBeNull();
    expect(salaryAllowances('{"name":"invalid"}')).toBeNull();
    expect(salaryAllowances('[{"name":"Lunch","amount":-1}]')).toBeNull();
    expect(salaryPeriodStatus(base, '2026-09-30')).toBe('upcoming');
    expect(salaryPeriodStatus(base, '2026-10-05')).toBe('current');
    expect(salaryPeriodStatus(base, '2026-10-16')).toBe('past');
  });
});
