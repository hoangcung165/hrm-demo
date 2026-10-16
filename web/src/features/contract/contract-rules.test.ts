import { contractDefaults, overlapsContract, parseAllowances, probationPay,
  validMoney, validateContract, validateAmendment } from './contract-rules';
import type { ContractWrite, AmendmentWrite } from './write';
import type { EmploymentContract } from './api';

const contract: EmploymentContract = {
  id: 'contract-1', employeeId: 'employee-1', contractNumber: 'HD-01',
  contractType: 'FIXED_TERM', signedOn: '2026-01-01', startsOn: '2026-01-01',
  endsOn: '2026-12-31', baseSalary: 18_000_000, insuranceSalary: 18_000_000,
  allowancesJson: '[]', insured: true, taxMethod: 'PROGRESSIVE',
};
const contractBody: ContractWrite = {
  contractNumber: 'HD-02', contractType: 'FIXED_TERM', signedOn: '2026-01-01',
  startsOn: '2027-01-01', endsOn: '2027-12-31', baseSalary: 20_000_000,
  insuranceSalary: 20_000_000, allowancesJson: '[]', insured: true,
  taxMethod: 'PROGRESSIVE', overrideReason: null,
};
const amendment: AmendmentWrite = {
  amendmentNumber: 'PL-01', signedOn: '2026-06-01', effectiveOn: '2026-06-16',
  description: 'Pay raise', baseSalary: 21_000_000, insuranceSalary: null,
  allowancesJson: null, insured: null, taxMethod: null, overrideReason: null,
};
describe('HRM-10 FE-2 contract rules', () => {
  it('defaults probation insurance and tax correctly, computes 85% reference salary', () => {
    expect(contractDefaults('PROBATION')).toEqual({ insured: false, taxMethod: 'WITHHOLD_10' });
    expect(contractDefaults('EMPLOYMENT_WITH_PROBATION')).toEqual({ insured: true, taxMethod: 'PROGRESSIVE' });
    expect(probationPay(20_000_000)).toBe(17_000_000);
  });
  it('detects inclusive overlapping intervals and permits consecutive dates', () => {
    expect(overlapsContract([contract], '2026-12-31', '2027-01-31')).toBe(true);
    expect(overlapsContract([contract], '2027-01-01', '2027-12-31')).toBe(false);
    expect(overlapsContract([contract], '2025-01-01', null)).toBe(true);
    expect(overlapsContract([contract], '2026-01-01', '2026-01-01', contract.id)).toBe(false);
  });
  it('rejects malformed money and non-array JSON allowances', () => {
    expect(validMoney('0')).toBe(true);
    expect(validMoney('-1')).toBe(false);
    expect(validMoney('1e7')).toBe(false);
    expect(validMoney('12.345')).toBe(false);
    expect(parseAllowances('[{"name":"Lunch","amount":500000}]')).not.toBeNull();
    expect(parseAllowances('{}')).toBeNull();
    expect(parseAllowances('garbage')).toBeNull();
  });
  it('validates contract overlapping periods and justified overrides', () => {
    expect(validateContract(contractBody, [contract])).toBeNull();
    expect(validateContract({ ...contractBody, startsOn: '2026-06-01' }, [contract])).toBe('overlap');
    expect(validateContract({ ...contractBody, endsOn: '2026-12-30' }, [])).toBe('date');
    expect(validateContract({ ...contractBody, insured: false }, [])).toBe('reason');
    expect(validateContract({ ...contractBody, insured: false, overrideReason: 'Exception approved' }, [])).toBeNull();
    expect(validateContract({ ...contractBody, allowancesJson: '{}' }, [])).toBe('allowances');
  });
  it('validates amendment effective date, changed fields and reason', () => {
    expect(validateAmendment(amendment, contract)).toBeNull();
    expect(validateAmendment({ ...amendment, effectiveOn: '2027-01-01' }, contract)).toBe('date');
    expect(validateAmendment({ ...amendment, baseSalary: null }, contract)).toBe('noChange');
    expect(validateAmendment({ ...amendment, insured: false }, contract)).toBe('reason');
    expect(validateAmendment({ ...amendment, insured: false, overrideReason: 'Policy exception' }, contract)).toBeNull();
  });
});
