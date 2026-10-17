import { contractExportPreview, EXPORT_KEYS } from './document-preview';
import { validateDocx } from './template-api';
import type { EmploymentContract } from './api';

const contract: EmploymentContract = {
  id: 'contract-1', employeeId: 'employee-1', contractNumber: 'HD-2026/42',
  contractType: 'FIXED_TERM', signedOn: '2026-09-01', startsOn: '2026-10-01',
  endsOn: null, baseSalary: 21_000_000, insuranceSalary: null, allowancesJson: '[]',
  insured: true, taxMethod: 'PROGRESSIVE',
};

describe('HRM-10 FE-4 merge-data preview', () => {
  it('matches precisely the field keys currently supported by BE-3', () => {
    const values = contractExportPreview(contract, { fullName: 'Nguyễn Văn An', code: 'NV00021' });
    expect(values.map(field => field.key)).toEqual(EXPORT_KEYS);
    expect(values.find(field => field.key === 'employee_name')?.value).toBe('Nguyễn Văn An');
    expect(values.find(field => field.key === 'contract_number')?.value).toBe('HD-2026/42');
    expect(values.find(field => field.key === 'starts_on')?.value).toBe('01/10/2026');
    expect(values.find(field => field.key === 'base_salary')?.value).toBe('21.000.000');
    expect(values.find(field => field.key === 'contract_type')?.value).toBe('Hợp đồng xác định thời hạn');
    expect(values.find(field => field.key === 'insured')?.value).toBe('Có');
    expect(values.find(field => field.key === 'tax_method')?.value).toBe('Lũy tiến');
  });
  it('flags only truly missing values and preserves legitimate false', () => {
    const values = contractExportPreview({ ...contract, insured: false }, { fullName: 'Nguyễn Văn An', code: 'NV00021' });
    expect(values.filter(x => x.missing).map(x => x.key)).toEqual(['ends_on', 'insurance_salary']);
    expect(values.find(x => x.key === 'insured')).toMatchObject({ value: 'Không', missing: false });
  });
  it('requires nonempty DOCX files no larger than 2 MiB', () => {
    expect(validateDocx(new File(['abc'], 'template.docx'))).toBeNull();
    expect(validateDocx(new File(['abc'], 'template.pdf'))).toBe('type');
    expect(validateDocx(new File([], 'empty.docx'))).toBe('size');
    expect(validateDocx(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'too-large.docx'))).toBe('size');
  });
});
