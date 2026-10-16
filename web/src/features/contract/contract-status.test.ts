import { contractState, groupContracts } from './contract-status';
import type { EmploymentContract } from './api';

const today = '2026-10-15';
const contract = (startsOn: string, endsOn: string | null) => ({ startsOn, endsOn });

function item(id: string, startsOn: string, endsOn: string | null): EmploymentContract {
  return {
    id, employeeId: 'employee-1', contractNumber: id,
    contractType: 'FIXED_TERM', signedOn: '2026-01-01',
    startsOn, endsOn, baseSalary: 18000000, insuranceSalary: 18000000,
    allowancesJson: '[]', insured: true, taxMethod: 'PROGRESSIVE',
  };
}

describe('contract term status', () => {
  it('treats effective-from and effective-until as inclusive dates', () => {
    expect(contractState(contract(today, today), today)).toBe('expiring');
    expect(contractState(contract('2026-10-16', null), today)).toBe('upcoming');
    expect(contractState(contract('2026-01-01', '2026-10-14'), today)).toBe('ended');
  });

  it('flags contracts ending within 30 days, but not on day 31', () => {
    expect(contractState(contract('2026-01-01', '2026-11-14'), today)).toBe('expiring');
    expect(contractState(contract('2026-01-01', '2026-11-15'), today)).toBe('current');
  });

  it('treats an open-ended agreement as active after its start', () => {
    expect(contractState(contract('2024-01-01', null), today)).toBe('current');
  });

  it('puts active and expiring contracts first without discarding history', () => {
    const rows = [
      item('past', '2023-01-01', '2024-01-01'),
      item('current', '2025-01-01', null),
      item('upcoming', '2026-11-01', null),
      item('expiring', '2025-01-01', '2026-10-25'),
    ];
    const grouped = groupContracts(rows, today);
    expect(grouped.current.map(x => x.id)).toEqual(['current', 'expiring']);
    expect(grouped.other.map(x => x.id)).toEqual(['past', 'upcoming']);
  });
});
