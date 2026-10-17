// Values currently available to BE-3's ContractDocxMerge (document-data preview, not a PDF render).
// Do not infer the actual template text: the server offers no preview or download endpoint.
import type { EmploymentContract } from './api';

export type ExportPreviewField = {
  key: string;
  value: string;
  missing: boolean;
};

/** Keep these keys aligned with ContractDocumentService.export's merge field map. */
export const EXPORT_KEYS = [
  'employee_name', 'employee_code', 'contract_number', 'contract_type',
  'signed_on', 'starts_on', 'ends_on', 'base_salary', 'insurance_salary',
  'insured', 'tax_method',
] as const;

// The exported contract is a Vietnamese document whatever language the interface uses, so these values are
// the document's own text and not interface strings. They mirror the server's ContractMergeValues.
const CONTRACT_TYPES: Record<string, string> = {
  PROBATION: 'Hợp đồng thử việc',
  FIXED_TERM: 'Hợp đồng xác định thời hạn',
  INDEFINITE: 'Hợp đồng không xác định thời hạn',
  EMPLOYMENT: 'Hợp đồng lao động',
  EMPLOYMENT_WITH_PROBATION: 'Hợp đồng lao động có thử việc',
};
const TAX_METHODS: Record<string, string> = { PROGRESSIVE: 'Lũy tiến', WITHHOLD_10: 'Khấu trừ 10%' };

const date = (iso: string | null) =>
  iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';

/** 18000000 becomes "18.000.000"; no value stays empty. */
const money = (value: number | null) =>
  value === null ? '' : String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function contractExportPreview(contract: EmploymentContract, employee: { fullName: string; code: string }): ExportPreviewField[] {
  const data: Record<(typeof EXPORT_KEYS)[number], string> = {
    employee_name: employee.fullName,
    employee_code: employee.code,
    contract_number: contract.contractNumber,
    contract_type: CONTRACT_TYPES[contract.contractType] ?? contract.contractType,
    signed_on: date(contract.signedOn),
    starts_on: date(contract.startsOn),
    ends_on: date(contract.endsOn),
    base_salary: money(contract.baseSalary),
    insurance_salary: money(contract.insuranceSalary),
    insured: contract.insured ? 'Có' : 'Không',
    tax_method: TAX_METHODS[contract.taxMethod] ?? contract.taxMethod,
  };
  return EXPORT_KEYS.map(key => ({
    key, value: data[key], missing: data[key].trim() === '',
  }));
}
